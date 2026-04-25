import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { Resend } from "resend";

admin.initializeApp();
const db = admin.firestore();

const normalizeEmail = (email: string): string => {
  const lower = email.trim().toLowerCase();
  const atIdx = lower.lastIndexOf("@");
  if (atIdx === -1) return lower;
  const local = lower.slice(0, atIdx);
  const domain = lower.slice(atIdx + 1);
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return local.replace(/\./g, "") + "@" + domain;
  }
  return lower;
};

interface Contact {
  email: string;
  name: string;
  sent: boolean;
  sentAt?: Date;
  error?: string;
  handoff?: boolean;
  handoffAt?: Date;
}

interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
  provider?: "smtp" | "resend";
  resendApiKey?: string;
  resendFrom?: string;
}

interface SendMailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
}

const sendMail = async (smtp: SmtpSettings, options: SendMailOptions): Promise<void> => {
  if (smtp.provider === "resend") {
    if (!smtp.resendApiKey) throw new Error("Resend API kľúč nie je nastavený");
    const resend = new Resend(smtp.resendApiKey);
    const fromAddr = smtp.resendFrom || smtp.from || smtp.user;
    const { error } = await resend.emails.send({
      from: fromAddr,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
  } else {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465,
      auth: { user: smtp.user, pass: smtp.pass },
    });
    await transporter.sendMail({
      from: options.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
    });
  }
};

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

// Backend poistka — HARD vulgárne slová nesmú nikdy odísť
const HARD_VULGAR_WORDS = [
  "jebať", "jebem", "jebe", "jebo", "vyjebať", "zajebať", "zjebať", "pojebať", "ojebať",
  "picsa", "piča", "pičovina", "pičku", "kurva", "kurvy", "kurvin", "kurvička",
  "kokot", "kokotina", "kokoti", "chuj", "chujna", "zmrd", "zmrdi", "hajzel",
  "vyhoniť", "buzerant", "buzerovať",
  "hujovina", "píča", "píčovina", "zkurvit", "zkurvený", "vykurvit", "kunda", "kundička",
  "čurák", "mrdka", "mrdat", "retard", "retardovaný",
  "fuck", "fucking", "fucked", "fucker", "motherfucker", "nigger", "faggot",
  "bitch", "pussy", "cunt", "whore", "slut", "cock", "dickhead", "asshole",
];

const containsHardVulgar = (text: string): string | null => {
  const lower = text.toLowerCase();
  for (const word of HARD_VULGAR_WORDS) {
    if (new RegExp(`\\b${word}\\b`, "i").test(lower)) {
      return word;
    }
  }
  return null;
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

  // Always record health ping so dashboard can show "last run" time
  await db.collection("settings").doc("schedulerHealth").set({
    lastRun: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

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

  // Read user-defined daily limit (default 10 if not set)
  const smtpConfigDoc = await db.collection("settings").doc("smtp").get();
  const configuredDailyLimit: number = (smtpConfigDoc.exists && (smtpConfigDoc.data() as any)?.dailyLimit)
    ? Math.min(50, Math.max(1, Number((smtpConfigDoc.data() as any).dailyLimit)))
    : 10;

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
      // Use saved target for today, or generate new one within configured limit
      dailyTarget = (data as any).dailyTarget || Math.floor(Math.random() * configuredDailyLimit) + 1;
      lastEmailSentAt = data.lastEmailSentAt || null;
    } else {
      // New day — random target between 1 and user-configured limit
      dailyTarget = Math.floor(Math.random() * configuredDailyLimit) + 1;
      await statsRef.set({
        sentToday: 0,
        lastResetDate: today,
        dailyTarget
      });
      console.log(`New day! Random target set to ${dailyTarget}/${configuredDailyLimit} emails`);
    }
  } else {
    // First run
    dailyTarget = Math.floor(Math.random() * configuredDailyLimit) + 1;
    await statsRef.set({
      sentToday: 0,
      lastResetDate: today,
      dailyTarget
    });
    console.log(`First run! Random target set to ${dailyTarget}/${configuredDailyLimit} emails`);
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

    // Check if campaign is truly finished (all contacts sent, none just handoff-skipped)
    const allContactsSnap = await db.collection("contacts").get();
    const totalAll = allContactsSnap.size;
    if (totalAll === 0) return;

    const sentCount = allContactsSnap.docs.filter(d => d.data().sent === true).length;
    const handoffCount = allContactsSnap.docs.filter(d => d.data().handoff === true && d.data().sent !== true).length;
    const remainingUnsent = totalAll - sentCount - handoffCount;

    // Only send notification once — check a flag in Firestore
    const campaignData = campaignDoc.data() || {};
    if (remainingUnsent === 0 && !campaignData.endNotificationSent) {
      console.log("Campaign finished! Sending end notification.");

      // Mark notification as sent to avoid spamming
      await db.collection("settings").doc("campaign").update({ endNotificationSent: true });

      // Load SMTP config
      const smtpDoc = await db.collection("settings").doc("smtp").get();
      if (!smtpDoc.exists) return;
      const smtp = smtpDoc.data() as SmtpSettings;

      const handoffNote = handoffCount > 0
        ? `\n\nℹ️ ${handoffCount} kontakt${handoffCount > 1 ? "y sú" : " je"} označen${handoffCount > 1 ? "é" : "ý"} ako „Riešim osobne" — emaily na ne neboli odoslané automaticky.`
        : "";

      const notifFrom = smtp.resendFrom || smtp.from || smtp.user;
      await sendMail(smtp, {
        from: notifFrom,
        to: smtp.user,
        subject: "✅ EMIL: Kampaň dokončená",
        text:
          `Dobrá správa!\n\n` +
          `EMIL úspešne dokončil kampaň.\n\n` +
          `📊 Štatistiky:\n` +
          `• Celkom kontaktov: ${totalAll}\n` +
          `• Odoslaných emailov: ${sentCount}\n` +
          `• Preskočených (handoff): ${handoffCount}\n` +
          handoffNote +
          `\n\nAk chceš spustiť novú kampaň, importuj nové kontakty a spusti kampaň v EMIL dashboarde.\n\n` +
          `— EMIL`,
      });

      console.log(`End notification sent to ${smtp.user}`);
    }

    return;
  }

  const contacts = contactsSnapshot.docs;
  const randomContact = contacts[
    Math.floor(Math.random() * contacts.length)
  ];
  const contactData = randomContact.data() as Contact;

  // Jednorazové/dočasné emaily — blokovať vždy, bez ohľadu na blacklist
  const TOXIC_DOMAINS = [
    "mailinator.com", "10minutemail.com", "guerrillamail.com", "temp-mail.org",
    "trashmail.com", "sharklasers.com", "getairmail.com", "yopmail.com",
    "dispostable.com", "spam4.me", "maildrop.cc", "mail-tester.com",
    "throwam.com", "spamgourmet.com", "fakeinbox.com", "mailnull.com",
  ];
  const contactDomain = (normalizeEmail(contactData.email).split("@")[1] || "");
  if (TOXIC_DOMAINS.includes(contactDomain)) {
    console.log(`Toxic domain detected for ${contactData.email}. Skipping permanently.`);
    await randomContact.ref.update({ sent: true, error: "Toxic domain — jednorazový email" });
    return;
  }

  // Fast O(1) blacklist check: doc ID = email alebo @doména
  const emailLower = normalizeEmail(contactData.email);
  const domainKey = "@" + (emailLower.split("@")[1] || "");

  const [emailBlacklistDoc, domainBlacklistDoc] = await Promise.all([
    db.collection("blacklist").doc(emailLower).get(),
    db.collection("blacklist").doc(domainKey).get(),
  ]);

  if (emailBlacklistDoc.exists || domainBlacklistDoc.exists) {
    console.log(`Contact ${contactData.email} is blacklisted. Marking and skipping.`);
    await randomContact.ref.update({ sent: true, error: "Blacklisted" });
    return;
  }

  // Human Handoff — kontakt prebratý človekom, automatika sa nezapína
  if (contactData.handoff === true) {
    console.log(`Contact ${contactData.email} is in human handoff. Skipping automated send.`);
    return;
  }

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

    // Backend poistka — HARD vulgárne slová nesmú nikdy odísť
    const vulgarInSubject = containsHardVulgar(subject);
    const vulgarInBody = containsHardVulgar(emailBody);
    if (vulgarInSubject || vulgarInBody) {
      const where = vulgarInSubject ? `predmet (${vulgarInSubject})` : `telo (${vulgarInBody})`;
      console.error(`BLOCKED: Email obsahuje zakázané slovo v ${where}. Email sa neodošle.`);
      await updateStats(false, `Blocked — zakázané slovo: ${vulgarInSubject || vulgarInBody}`);
      return;
    }

    // Auto-prepend greeting and auto-append closing + device (device can be empty = no signature)
    // Each part is trimmed so trailing newlines in textarea fields don't create empty space
    const optOut: string = emailSettings.data()?.optOut || "";

    const parts = [
      ...(greeting.trim() ? [greeting.trim()] : []),
      emailBody.trim(),
      ...(optOut.trim() ? [optOut.trim()] : []),
      ...(closing.trim() ? [closing.trim()] : []),
      ...(device.trim() ? [device.trim()] : []),
    ];
    const textBody = parts.join("\n\n");

    const fromAddr = smtpSettings.resendFrom || smtpSettings.from || smtpSettings.user;
    await sendMail(smtpSettings, {
      from: fromAddr,
      to: contactData.email,
      subject: subject,
      text: textBody,
    });

    await randomContact.ref.update({
      sent: true,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      subject: subject,
      lastEmailBody: textBody,
    });

    // Update stats with timestamp of last sent email
    await statsRef.update({
      lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await updateStats(true);
    console.log(`Email sent successfully to ${contactData.email}`);
  } catch (error: any) {
    console.error("Error sending email:", error);

    // Hard bounce detection — SMTP 5xx permanent failures → auto-blacklist
    const HARD_BOUNCE_CODES = [550, 551, 553, 554, 521, 541];
    const responseCode = error.responseCode || (error.response ? parseInt(error.response.substring(0, 3)) : 0);
    const isHardBounce = HARD_BOUNCE_CODES.includes(responseCode);

    if (isHardBounce) {
      console.log(`Hard bounce detected for ${contactData.email} (code ${responseCode}). Auto-blacklisting.`);
      try {
        const emailLowerBounce = normalizeEmail(contactData.email);
        await db.collection("blacklist").doc(emailLowerBounce).set({
          value: emailLowerBounce,
          type: "hard_bounce",
          reason: `Hard bounce (SMTP ${responseCode}): ${error.message}`,
          addedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Mark contact so it won't be retried
        await randomContact.ref.update({
          sent: true,
          error: `Hard bounce — blacklisted (${responseCode})`,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } catch (blErr) {
        console.error("Failed to auto-blacklist:", blErr);
      }
    } else {
      // Soft bounce — plná schránka, dočasný výpadok → počítaj pokusy s časovým filtrom
      const SOFT_BOUNCE_LIMIT = 3;
      const MIN_DAYS_SPAN = 3; // bouncy musia byť aspoň 72h (3 dni) od prvého pokusu
      const contactSnap = randomContact.data() as any;
      const currentCount: number = contactSnap.softBounceCount || 0;
      const firstBounceAt: admin.firestore.Timestamp | null = contactSnap.firstSoftBounceAt || null;
      const now = admin.firestore.Timestamp.now();
      const newCount = currentCount + 1;

      // Vypočítaj koľko hodín uplynulo od prvého soft bounce
      const hoursSinceFirst = firstBounceAt
        ? (now.toMillis() - firstBounceAt.toMillis()) / 1000 / 3600
        : 0;
      const spansMultipleDays = hoursSinceFirst >= 24 * MIN_DAYS_SPAN;

      const shouldBlacklist = newCount >= SOFT_BOUNCE_LIMIT && spansMultipleDays;

      if (shouldBlacklist) {
        console.log(`Soft bounce limit (${SOFT_BOUNCE_LIMIT}x za ${Math.round(hoursSinceFirst)}h) reached for ${contactData.email}. Auto-blacklisting.`);
        try {
          const emailLower = normalizeEmail(contactData.email);
          await db.collection("blacklist").doc(emailLower).set({
            value: emailLower,
            type: "hard_bounce",
            reason: `Soft bounce ${SOFT_BOUNCE_LIMIT}x za ${Math.round(hoursSinceFirst)}h: ${error.message}`,
            addedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          await randomContact.ref.update({
            sent: true,
            error: `Soft bounce limit dosiahnutý (${SOFT_BOUNCE_LIMIT}x / ${Math.round(hoursSinceFirst)}h) — blacklisted`,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            softBounceCount: newCount,
          });
        } catch (blErr) {
          console.error("Failed to auto-blacklist soft bounce:", blErr);
        }
      } else {
        const reason = newCount >= SOFT_BOUNCE_LIMIT
          ? `Soft bounce ${newCount}x, ale len ${Math.round(hoursSinceFirst)}h — čakám na potvrdenie cez 24h`
          : `Soft bounce ${newCount}/${SOFT_BOUNCE_LIMIT}`;
        console.log(`${reason} for ${contactData.email}. Will retry.`);
        await randomContact.ref.update({
          error: error.message,
          softBounceCount: newCount,
          firstSoftBounceAt: firstBounceAt || now,
        });
      }
    }

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

  // Read user-configured daily limit from SMTP settings
  const smtpDoc = await db.collection("settings").doc("smtp").get();
  const configuredLimit = (smtpDoc.exists && (smtpDoc.data() as any)?.dailyLimit)
    ? Math.min(50, Math.max(1, Number((smtpDoc.data() as any).dailyLimit)))
    : DAILY_LIMIT;

  return {
    sentToday,
    remainingContacts,
    errorsToday,
    totalContacts,
    dailyLimit: configuredLimit,
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

// Send test email to the logged-in user's own email address
export const sendTestEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }

  const smtpDoc = await db.collection("settings").doc("smtp").get();
  if (!smtpDoc.exists) {
    throw new functions.https.HttpsError("not-found", "SMTP nastavenia nie sú nakonfigurované");
  }
  const smtp = smtpDoc.data() as SmtpSettings;

  const emailDoc = await db.collection("settings").doc("email").get();
  if (!emailDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Email obsah nie je nakonfigurovaný");
  }
  const emailSettings = emailDoc.data() as {
    subjects: string[];
    greetings: string[];
    closings: string[];
    devices: string[];
    emailBody: string;
    optOut?: string;
  };

  const subject = parseSpintax(
    emailSettings.subjects?.[Math.floor(Math.random() * (emailSettings.subjects?.length || 1))] || "Test"
  );
  const greeting = getRandomGreeting(emailSettings.greetings || []);
  const closing = getRandomClosing(emailSettings.closings || []);
  const device = getRandomDevice(emailSettings.devices || []);
  const body = parseSpintax(emailSettings.emailBody || "")
    .replace(/\{\{name\}\}/g, "Ján Novák (test)");
  const optOut: string = emailSettings.optOut || "";

  const parts = [
    ...(greeting.trim() ? [greeting.trim()] : []),
    body.trim(),
    ...(optOut.trim() ? [optOut.trim()] : []),
    ...(closing.trim() ? [closing.trim()] : []),
    ...(device.trim() ? [device.trim()] : []),
  ];
  const textBody = parts.join("\n\n");

  const fromAddr = smtp.resendFrom || smtp.from || smtp.user;
  await sendMail(smtp, {
    from: fromAddr,
    to: smtp.user,
    subject: `[TEST] ${subject}`,
    text: textBody,
  });

  return { success: true, to: smtp.user };
});
