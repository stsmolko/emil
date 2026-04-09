import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";

admin.initializeApp();
const db = admin.firestore();

interface Contact {
  email: string;
  name: string;
  sent: boolean;
  sentAt?: Date;
  error?: string;
}

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

interface EmailStats {
  sentToday: number;
  lastResetDate: string;
  lastEmailSentAt?: admin.firestore.Timestamp;
}

const DAILY_LIMIT = 10;
const WORKING_HOURS_START = 7;
const WORKING_HOURS_END = 21;
const MIN_EMAIL_INTERVAL_MINUTES = 30; // Minimum 30 minutes between emails

const getRandomDelay = (): number => {
  return Math.floor(Math.random() * 120000) + 60000;
};

const WORKING_HOURS_END_SATURDAY = 18;

const isWorkingHours = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // No emails on Sunday
  if (day === 0) {
    return false;
  }

  // Lunch break: 12:00 - 13:00 (no emails during lunch)
  if (hour === 12) {
    return false;
  }

  // Saturday: 7:00 - 18:00
  if (day === 6) {
    return hour >= WORKING_HOURS_START && hour < WORKING_HOURS_END_SATURDAY;
  }

  // Monday–Friday: 7:00 - 21:00
  return hour >= WORKING_HOURS_START && hour < WORKING_HOURS_END;
};

const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

// Spintax parser - generates random variations from {option1|option2|option3} format
const parseSpintax = (text: string): string => {
  // Recursive function to process nested spintax
  const processSpintax = (input: string): string => {
    const regex = /\{([^{}]*)\}/;
    let match = input.match(regex);
    
    while (match) {
      const options = match[1].split('|');
      const randomOption = options[Math.floor(Math.random() * options.length)];
      input = input.replace(match[0], randomOption);
      match = input.match(regex);
    }
    
    return input;
  };
  
  return processSpintax(text);
};

const getRandomGreeting = (greetings: string[]): string => {
  if (!greetings || greetings.length === 0) {
    return "";
  }
  const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
  return parseSpintax(randomGreeting);
};

const getRandomClosing = (closings: string[]): string => {
  if (!closings || closings.length === 0) {
    return "";
  }
  const randomClosing = closings[Math.floor(Math.random() * closings.length)];
  return parseSpintax(randomClosing);
};

const getRandomDevice = (devices: string[]): string => {
  if (!devices || devices.length === 0) {
    return "";
  }
  const randomDevice = devices[Math.floor(Math.random() * devices.length)];
  return parseSpintax(randomDevice);
};

const getRandomSubject = async (): Promise<string> => {
  try {
    const settingsDoc = await db.collection("settings").doc("email").get();
    
    if (!settingsDoc.exists || !settingsDoc.data()?.subjects || settingsDoc.data()?.subjects.length === 0) {
      throw new Error("Predmety emailov nie sú nastavené. Prosím, nastavte ich v sekcii Správa.");
    }
    
    const subjects = settingsDoc.data()!.subjects;
    const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
    
    // Apply spintax parsing to create variations
    return parseSpintax(randomSubject);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    throw error;
  }
};

const updateStats = async (success: boolean, error?: string) => {
  const today = getTodayDateString();
  const statsRef = db.collection("stats").doc("daily");

  await db.runTransaction(async (transaction) => {
    const statsDoc = await transaction.get(statsRef);
    let stats: EmailStats = {sentToday: 0, lastResetDate: today};

    if (statsDoc.exists) {
      const data = statsDoc.data() as EmailStats;
      if (data.lastResetDate !== today) {
        stats = {sentToday: 0, lastResetDate: today};
      } else {
        stats = data;
      }
    }

    if (success) {
      stats.sentToday += 1;
    }

    transaction.set(statsRef, stats, {merge: true});
  });

  await db.collection("email_logs").add({
    success,
    error: error || null,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    date: today,
  });
};

export const mailScheduler = functions.pubsub.schedule("every 30 minutes").timeZone("Europe/Bratislava").onRun(async () => {
  console.log("Smart Scheduler triggered");

  // Check if campaign is active
  const campaignDoc = await db.collection("settings").doc("campaign").get();
  const campaignActive = campaignDoc.exists && campaignDoc.data()?.active === true;
  
  if (!campaignActive) {
    console.log("Campaign is not active. Waiting for user to start campaign.");
    return;
  }

  if (!isWorkingHours()) {
    console.log("Outside working hours (Mon-Sat, 7:00-21:00, lunch break 12:00-13:00). Skipping.");
    return;
  }

  const today = getTodayDateString();
  const statsRef = db.collection("stats").doc("daily");
  const statsDoc = await statsRef.get();

  let sentToday = 0;
  let dailyTarget = 0;
  let lastEmailSentAt: admin.firestore.Timestamp | null = null;

  if (statsDoc.exists) {
    const data = statsDoc.data() as EmailStats;
    if (data.lastResetDate === today) {
      sentToday = data.sentToday;
      dailyTarget = (data as any).dailyTarget || Math.floor(Math.random() * 10) + 1;
      lastEmailSentAt = data.lastEmailSentAt || null;
    } else {
      // New day - set random target between 1-10
      dailyTarget = Math.floor(Math.random() * 10) + 1;
      await statsRef.set({
        sentToday: 0,
        lastResetDate: today,
        dailyTarget
      });
      console.log(`New day! Random target set to ${dailyTarget} emails`);
    }
  } else {
    // First run - set random target
    dailyTarget = Math.floor(Math.random() * 10) + 1;
    await statsRef.set({
      sentToday: 0,
      lastResetDate: today,
      dailyTarget
    });
    console.log(`First run! Random target set to ${dailyTarget} emails`);
  }

  if (sentToday >= dailyTarget) {
    console.log(`Daily target reached (${sentToday}/${dailyTarget}). Skipping.`);
    return;
  }

  // Check minimum interval between emails (30 minutes)
  if (lastEmailSentAt) {
    const now = admin.firestore.Timestamp.now();
    const minutesSinceLastEmail = (now.toMillis() - lastEmailSentAt.toMillis()) / 1000 / 60;
    
    if (minutesSinceLastEmail < MIN_EMAIL_INTERVAL_MINUTES) {
      console.log(`Too soon! Only ${Math.floor(minutesSinceLastEmail)} minutes since last email. Need ${MIN_EMAIL_INTERVAL_MINUTES} minutes minimum.`);
      return;
    }
    
    // Add randomness: even if 30 minutes passed, only 60% chance to send
    // This creates more natural, unpredictable timing
    if (Math.random() > 0.6) {
      console.log(`Random skip - waiting longer for more natural timing (${Math.floor(minutesSinceLastEmail)} min since last email)`);
      return;
    }
  }

  const contactsSnapshot = await db
    .collection("contacts")
    .where("sent", "==", false)
    .limit(10)
    .get();

  if (contactsSnapshot.empty) {
    console.log("No unsent contacts found.");
    return;
  }

  const contacts = contactsSnapshot.docs;
  const randomContact = contacts[
    Math.floor(Math.random() * contacts.length)
  ];
  const contactData = randomContact.data() as Contact;

  const settingsDoc = await db.collection("settings").doc("smtp").get();
  if (!settingsDoc.exists) {
    console.error("SMTP settings not configured");
    await updateStats(false, "SMTP settings not configured");
    return;
  }

  const smtpSettings = settingsDoc.data() as SmtpSettings;

  const delay = getRandomDelay();
  console.log(`Waiting ${delay}ms before sending...`);
  await new Promise((resolve) => setTimeout(resolve, delay));

  const transporter = nodemailer.createTransport({
    host: smtpSettings.host,
    port: smtpSettings.port,
    secure: smtpSettings.port === 465,
    auth: {
      user: smtpSettings.user,
      pass: smtpSettings.pass,
    },
  });

  try {
    const subject = await getRandomSubject();
    const emailSettings = await db.collection("settings").doc("email").get();
    const greetings: string[] = emailSettings.data()?.greetings || [];
    const greeting = getRandomGreeting(greetings);
    const closings: string[] = emailSettings.data()?.closings || [];
    const closing = getRandomClosing(closings);
    const devices: string[] = emailSettings.data()?.devices || [];
    const device = getRandomDevice(devices);

    let emailBody = emailSettings.data()?.emailBody ||
      `{{greeting}}\n\nMáme pre teba špeciálnu ponuku.\n\nS pozdravom,\nTím`;

    // Apply spintax to email body
    emailBody = parseSpintax(emailBody);

    // Replace {{name}} placeholder
    emailBody = emailBody.replace(/\{\{name\}\}/g, contactData.name);

    // Auto-prepend greeting and auto-append closing + device (device can be empty = no signature)
    const parts = [
      ...(greeting ? [greeting] : []),
      emailBody,
      ...(closing ? [closing] : []),
      ...(device.trim() ? [device] : []),
    ];
    const textBody = parts.join("\n\n");

    await transporter.sendMail({
      from: smtpSettings.from,
      to: contactData.email,
      subject: subject,
      text: textBody,
    });

    await randomContact.ref.update({
      sent: true,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      subject: subject,
    });

    // Update stats with timestamp of last sent email
    await statsRef.update({
      lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await updateStats(true);
    console.log(`Email sent successfully to ${contactData.email}`);
  } catch (error: any) {
    console.error("Error sending email:", error);
    await randomContact.ref.update({
      error: error.message,
    });
    await updateStats(false, error.message);
  }
});

export const getDashboardStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const today = getTodayDateString();
  const statsDoc = await db.collection("stats").doc("daily").get();

  let sentToday = 0;
  if (statsDoc.exists) {
    const data = statsDoc.data() as EmailStats;
    if (data.lastResetDate === today) {
      sentToday = data.sentToday;
    }
  }

  const contactsSnapshot = await db.collection("contacts").get();
  const totalContacts = contactsSnapshot.size;
  const sentContacts = contactsSnapshot.docs.filter(
    (doc) => doc.data().sent === true
  ).length;
  const remainingContacts = totalContacts - sentContacts;

  const logsSnapshot = await db
    .collection("email_logs")
    .where("success", "==", false)
    .where("date", "==", today)
    .get();
  const errorsToday = logsSnapshot.size;

  return {
    sentToday,
    remainingContacts,
    errorsToday,
    totalContacts,
    dailyLimit: DAILY_LIMIT,
  };
});

// Toggle campaign on/off
export const toggleCampaign = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const action = data.action; // 'start' or 'stop'
  
  if (action !== 'start' && action !== 'stop') {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Action must be 'start' or 'stop'"
    );
  }

  const active = action === 'start';
  
  // Update campaign status
  await db.collection("settings").doc("campaign").set({
    active: active,
    lastModified: admin.firestore.FieldValue.serverTimestamp(),
    modifiedBy: context.auth.uid,
  }, { merge: true });

  console.log(`Campaign ${active ? 'started' : 'stopped'} by user ${context.auth.uid}`);

  return {
    success: true,
    active: active,
    message: active ? "Kampaň spustená! Emaily sa začnú odosielať automaticky." : "Kampaň zastavená. Žiadne emaily sa nebudú odosielať.",
  };
});

// Get campaign status
export const getCampaignStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const campaignDoc = await db.collection("settings").doc("campaign").get();
  const active = campaignDoc.exists && campaignDoc.data()?.active === true;

  return {
    active: active,
    lastModified: campaignDoc.exists ? campaignDoc.data()?.lastModified : null,
  };
});
