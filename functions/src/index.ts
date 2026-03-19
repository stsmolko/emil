import {onSchedule} from "firebase-functions/v2/scheduler";
import {onCall, HttpsError} from "firebase-functions/v2/https";
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
}

const DAILY_LIMIT = 5;
const WORKING_HOURS_START = 7;
const WORKING_HOURS_END = 21;

const getRandomDelay = (): number => {
  return Math.floor(Math.random() * 120000) + 60000;
};

const isWorkingHours = (): boolean => {
  const now = new Date();
  const hour = now.getHours();
  return hour >= WORKING_HOURS_START && hour < WORKING_HOURS_END;
};

const getTodayDateString = (): string => {
  const today = new Date();
  return today.toISOString().split("T")[0];
};

const getRandomSubject = async (): Promise<string> => {
  try {
    const settingsDoc = await db.collection("settings").doc("email").get();
    const subjects = settingsDoc.data()?.subjects || [
      "Dôležitá informácia",
      "Ponuka len pre vás",
      "Nesmeš to zmeškať",
      "Špeciálna príležitosť",
      "Posledná šanca",
    ];
    return subjects[Math.floor(Math.random() * subjects.length)];
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return "Ponuka pre vás";
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

export const smartScheduler = onSchedule("every 30 minutes", async () => {
  console.log("Smart Scheduler triggered");

  if (!isWorkingHours()) {
    console.log("Outside working hours (7:00-21:00). Skipping.");
    return;
  }

  const today = getTodayDateString();
  const statsRef = db.collection("stats").doc("daily");
  const statsDoc = await statsRef.get();

  let sentToday = 0;
  if (statsDoc.exists) {
    const data = statsDoc.data() as EmailStats;
    if (data.lastResetDate === today) {
      sentToday = data.sentToday;
    }
  }

  if (sentToday >= DAILY_LIMIT) {
    console.log(`Daily limit reached (${DAILY_LIMIT}). Skipping.`);
    return;
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

  const subject = await getRandomSubject();
  const emailBody = settingsDoc.data()?.emailBody ||
    `Ahoj ${contactData.name},\n\nMáme pre teba špeciálnu ponuku.\n\nS pozdravom,\nTím`;

  try {
    await transporter.sendMail({
      from: smtpSettings.from,
      to: contactData.email,
      subject: subject,
      text: emailBody.replace("{{name}}", contactData.name),
      html: `<p>${emailBody.replace("{{name}}", contactData.name).replace(/\n/g, "<br>")}</p>`,
    });

    await randomContact.ref.update({
      sent: true,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      subject: subject,
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

export const getStats = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
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
