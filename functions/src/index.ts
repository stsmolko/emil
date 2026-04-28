// Runtime: Node.js 22
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import * as nodemailer from "nodemailer";
import { Resend } from "resend";
import { ImapFlow } from "imapflow";
import { promises as dnsPromises } from "dns";

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

// RFC 5322 — zjednodušený regex pre bežné emaily
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// MX cache — aby sme sa nepytali DNS opakovane na tú istú doménu
const mxCache: Record<string, boolean> = {};

const hasMxRecord = async (domain: string): Promise<boolean> => {
  if (domain in mxCache) return mxCache[domain];
  try {
    const records = await dnsPromises.resolveMx(domain);
    const result = Array.isArray(records) && records.length > 0;
    mxCache[domain] = result;
    return result;
  } catch {
    mxCache[domain] = false;
    return false;
  }
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
  resendReplyTo?: string;
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPass?: string;
  notifyEmail?: string;
}

interface SendMailOptions {
  from: string;
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

const sendMail = async (smtp: SmtpSettings, options: SendMailOptions): Promise<string | null> => {
  if (smtp.provider === "resend") {
    if (!smtp.resendApiKey) throw new Error("Resend API kľúč nie je nastavený");
    const resend = new Resend(smtp.resendApiKey);
    const fromAddr = smtp.resendFrom || smtp.from || smtp.user;
    const { data, error } = await resend.emails.send({
      from: fromAddr,
      to: options.to,
      subject: options.subject,
      text: options.text,
      ...(options.replyTo ? { replyTo: options.replyTo } : {}),
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
    return data?.id || null;
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
    return null;
  }
};

interface EmailStats {
  sentToday: number;
  lastResetDate: string;
  lastEmailSentAt?: admin.firestore.Timestamp;
}

const DAILY_LIMIT = 10;
/** Max. znakov finálneho textu emailu uložených v logu (pre náhľad v UI). */
const LOG_BODY_PREVIEW_MAX = 6000;
const WORKING_HOURS_START = 7;
const WORKING_HOURS_END = 21;
const MIN_EMAIL_INTERVAL_MINUTES = 30; // Minimum 30 minutes between emails

const getRandomDelay = (): number => {
  return Math.floor(Math.random() * 20000) + 5000; // 5–25 sekúnd
};

/** Hodina (0–23) a deň v týždni (0=Ne … 6=So) v Europe/Bratislava */
const getBratislavaClock = (): { hour: number; day: number } => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Bratislava",
    weekday: "short",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const m: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") m[p.type] = p.value;
  }
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const day = dayMap[m.weekday || "Sun"] ?? 0;
  const hour = parseInt(m.hour || "0", 10);
  return { hour, day };
};

/**
 * Odosielanie: Ne vôbec; obed 12:00–12:59 vždy nie.
 * Po až od 13:00; Ut–Št 7:00–21:00; Pia len do 13:00 (ráno po obede už nie);
 * So len do 12:00 (7–11).
 */
const isWorkingHours = (): boolean => {
  const { hour, day } = getBratislavaClock();

  if (day === 0) return false;

  if (hour === 12) return false;

  if (day === 1) {
    return hour >= 13 && hour < WORKING_HOURS_END;
  }
  if (day === 5) {
    return hour >= WORKING_HOURS_START && hour < 13;
  }
  if (day === 6) {
    return hour >= WORKING_HOURS_START && hour < 12;
  }
  return hour >= WORKING_HOURS_START && hour < WORKING_HOURS_END;
};

const getTodayDateString = (): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

interface LogData {
  contactName?: string;
  contactEmail?: string;
  subject?: string;
  bodyPreview?: string;
  event: "sent" | "error" | "blocked" | "bounce" | "delivered" | "spam_complaint" | "handoff";
}

const updateStats = async (success: boolean, error?: string, logData?: LogData) => {
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
    event: logData?.event || (success ? "sent" : "error"),
    contactName: logData?.contactName || null,
    contactEmail: logData?.contactEmail || null,
    subject: logData?.subject || null,
    bodyPreview: logData?.bodyPreview || null,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    date: today,
  });
};

export const mailScheduler = functions.runWith({ timeoutSeconds: 300, memory: "256MB" }).pubsub.schedule("every 30 minutes").timeZone("Europe/Bratislava").onRun(async () => {
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
    console.log(
      "Outside working hours (Europe/Bratislava: Ne nie; Po od 13; Ut–Št 7–21; Pia do 13; So do 12; obed 12 vždy nie). Skipping."
    );
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

  // Regex validácia formátu emailu
  if (!EMAIL_REGEX.test(contactData.email.trim())) {
    console.log(`Invalid email format: ${contactData.email}. Skipping permanently.`);
    await randomContact.ref.update({ sent: true, error: "Neplatný formát emailu" });
    await updateStats(false, "Neplatný formát emailu", {
      event: "error", contactName: contactData.name, contactEmail: contactData.email,
    });
    return;
  }

  // MX check — overí že doména prijíma emaily
  const domainHasMx = await hasMxRecord(contactDomain);
  if (!domainHasMx) {
    console.log(`No MX records for domain ${contactDomain} (${contactData.email}). Skipping permanently.`);
    await randomContact.ref.update({ sent: true, error: `Doména ${contactDomain} nemá MX záznamy` });
    await updateStats(false, `Doména ${contactDomain} nemá MX záznamy`, {
      event: "error", contactName: contactData.name, contactEmail: contactData.email,
    });
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
    let subject = await getRandomSubject();
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

    // Replace template variables
    const now = new Date();
    const skDays = ["nedeľa","pondelok","utorok","streda","štvrtok","piatok","sobota"];
    const skMonths = ["januára","februára","marca","apríla","mája","júna","júla","augusta","septembra","októbra","novembra","decembra"];
    const dayName = skDays[now.getDay()];
    const monthName = skMonths[now.getMonth()];
    const dateStr = `${dayName} ${now.getDate()}. ${monthName}`;
    const weekNum = Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);
    const senderName = (smtpSettings.resendFrom || "").replace(/<[^>]+>/, "").trim() || smtpSettings.resendFrom || "";
    const senderDomain = (smtpSettings.resendFrom || "").match(/@([^>]+)>/)?.[1] || "";

    const replacements: Record<string, string> = {
      name: contactData.name,
      email: contactData.email,
      date: dateStr,
      day: dayName,
      month: monthName,
      year: String(now.getFullYear()),
      week: `${weekNum}. týždeň`,
      sender: senderName,
      domain: senderDomain,
    };

    for (const [key, value] of Object.entries(replacements)) {
      emailBody = emailBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
      subject = subject.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }

    // Backend poistka — HARD vulgárne slová nesmú nikdy odísť
    const vulgarInSubject = containsHardVulgar(subject);
    const vulgarInBody = containsHardVulgar(emailBody);
    if (vulgarInSubject || vulgarInBody) {
      const where = vulgarInSubject ? `predmet (${vulgarInSubject})` : `telo (${vulgarInBody})`;
      console.error(`BLOCKED: Email obsahuje zakázané slovo v ${where}. Email sa neodošle.`);
      await updateStats(false, `Blocked — zakázané slovo: ${vulgarInSubject || vulgarInBody}`, {
        event: "blocked",
        contactName: contactData.name,
        contactEmail: contactData.email,
        subject,
      });
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
    const resendEmailId = await sendMail(smtpSettings, {
      from: fromAddr,
      to: contactData.email,
      subject: subject,
      text: textBody,
      ...(smtpSettings.resendReplyTo ? { replyTo: smtpSettings.resendReplyTo } : {}),
    });

    await randomContact.ref.update({
      sent: true,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      subject: subject,
      lastEmailBody: textBody,
      deliveryStatus: "sent",
      ...(resendEmailId ? { resendEmailId } : {}),
    });

    // Update stats with timestamp of last sent email
    await statsRef.update({
      lastEmailSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await updateStats(true, undefined, {
      event: "sent",
      contactName: contactData.name,
      contactEmail: contactData.email,
      subject,
      bodyPreview: textBody.slice(0, LOG_BODY_PREVIEW_MAX),
    });
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

    await updateStats(false, error.message, {
      event: "error",
      contactName: contactData.name,
      contactEmail: contactData.email,
    });
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

  let automationQueue = 0;
  let handoffWaiting = 0;
  contactsSnapshot.docs.forEach((doc) => {
    const d = doc.data();
    if (d.sent === true) return;
    if (d.handoff === true) handoffWaiting += 1;
    else automationQueue += 1;
  });

  const campaignDocStats = await db.collection("settings").doc("campaign").get();
  const campaignActive = campaignDocStats.exists && campaignDocStats.data()?.active === true;

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
    automationQueue,
    handoffWaiting,
    campaignActive,
  };
});

/** Rýchla kontrola Resend API kľúča bez odoslania emailu. */
export const smokeTestResend = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  const smtpDoc = await db.collection("settings").doc("smtp").get();
  if (!smtpDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Nastavenia nie sú uložené");
  }
  const smtp = smtpDoc.data() as SmtpSettings;
  if (smtp.provider !== "resend" || !smtp.resendApiKey) {
    return { success: false, message: "Smoke test je len pre Resend — nastav API kľúč a provider Resend." };
  }
  try {
    const r = await fetch("https://api.resend.com/domains", {
      method: "GET",
      headers: { Authorization: `Bearer ${smtp.resendApiKey}` },
    });
    if (r.ok) {
      const j = await r.json() as { data?: unknown[] };
      const n = Array.isArray(j?.data) ? j.data.length : 0;
      return { success: true, message: `Resend API OK — načítaných ${n} domén.` };
    }
    const errText = await r.text();
    return { success: false, message: `Resend odpoveď ${r.status}: ${errText.slice(0, 200)}` };
  } catch (e: any) {
    return { success: false, message: e?.message || String(e) };
  }
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

  const now = new Date();
  const days = ["nedeľa","pondelok","utorok","streda","štvrtok","piatok","sobota"];
  const months = ["januára","februára","marca","apríla","mája","júna","júla","augusta","septembra","októbra","novembra","decembra"];
  const dateStr = `${days[now.getDay()]} ${now.getDate()}. ${months[now.getMonth()]}`;
  const weekNum = Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + new Date(now.getFullYear(), 0, 1).getDay() + 1) / 7);
  const senderName = (smtp.resendFrom || "").replace(/<[^>]+>/, "").trim() || smtp.resendFrom || "";
  const senderDomain = (smtp.resendFrom || "").match(/@([^>]+)>/)?.[1] || "";

  const testReplacements: Record<string, string> = {
    name: "Ján Novák (test)",
    email: smtp.user,
    date: dateStr,
    day: days[now.getDay()],
    month: months[now.getMonth()],
    year: String(now.getFullYear()),
    week: `${weekNum}. týždeň`,
    sender: senderName,
    domain: senderDomain,
  };

  const applyVars = (text: string) => {
    let result = parseSpintax(text);
    for (const [key, value] of Object.entries(testReplacements)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    }
    return result;
  };

  const subject = applyVars(
    emailSettings.subjects?.[Math.floor(Math.random() * (emailSettings.subjects?.length || 1))] || "Test"
  );
  const greeting = applyVars(getRandomGreeting(emailSettings.greetings || []));
  const closing = applyVars(getRandomClosing(emailSettings.closings || []));
  const device = applyVars(getRandomDevice(emailSettings.devices || []));
  const body = applyVars(emailSettings.emailBody || "");
  const optOut: string = applyVars(emailSettings.optOut || "");

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

// ─────────────────────────────────────────────────────────────────────────────
// RESEND WEBHOOK — bounce & spam complaint auto-blacklist
// ─────────────────────────────────────────────────────────────────────────────
export const resendWebhook = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const event = req.body;
  const eventType: string = event?.type || "";
  const toList: string[] = event?.data?.to || [];
  const recipientEmail: string = toList[0] || "";

  if (!recipientEmail) {
    res.status(400).send("Missing recipient");
    return;
  }

  const emailLower = normalizeEmail(recipientEmail);

  // Hard bounce — adresa neexistuje → blacklist
  if (eventType === "email.bounced") {
    try {
      await db.collection("blacklist").doc(emailLower).set({
        value: emailLower,
        type: "hard_bounce",
        reason: `Resend bounce: ${event?.data?.bounce?.message || "permanent failure"}`,
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const contactSnap = await db.collection("contacts")
        .where("email", "==", emailLower).limit(1).get();
      let contactName = "";
      let subject = "";
      if (!contactSnap.empty) {
        contactName = contactSnap.docs[0].data().name || "";
        subject = contactSnap.docs[0].data().subject || "";
        await contactSnap.docs[0].ref.update({
          sent: true,
          error: "Hard bounce — auto-blacklisted via Resend webhook",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      const bounceReason = event?.data?.bounce?.message || event?.data?.error?.message || event?.data?.reason || "permanent failure";
      await db.collection("email_logs").add({
        success: false,
        event: "bounce",
        contactEmail: emailLower,
        contactName,
        subject,
        error: `Hard bounce: ${bounceReason}`,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        date: getTodayDateString(),
      });
      console.log(`Resend bounce: ${emailLower} auto-blacklisted`);
    } catch (err) {
      console.error("Webhook blacklist error:", err);
    }
  }

  // Delivered — aktualizuj stav doručenia
  if (eventType === "email.delivered") {
    try {
      const contactSnap = await db.collection("contacts")
        .where("email", "==", emailLower).limit(1).get();
      let contactName = "";
      let subject = "";
      if (!contactSnap.empty) {
        contactName = contactSnap.docs[0].data().name || "";
        subject = contactSnap.docs[0].data().subject || "";
        await contactSnap.docs[0].ref.update({ deliveryStatus: "delivered" });
      }
      await db.collection("email_logs").add({
        success: true,
        event: "delivered",
        contactEmail: emailLower,
        contactName,
        subject,
        error: null,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        date: getTodayDateString(),
      });
      console.log(`Resend delivered: ${emailLower}`);
    } catch (err) {
      console.error("Webhook delivered update error:", err);
    }
  }

  // Inbound reply — kontakt odpovedal → handoff
  if (eventType === "email.received") {
    try {
      const fromRaw: string = event?.data?.from || "";
      const fromEmail = fromRaw.match(/<([^>]+)>/)?.[1] || fromRaw.trim();
      if (fromEmail) {
        const senderNorm = normalizeEmail(fromEmail);
        const contactSnap = await db.collection("contacts")
          .where("email", "==", senderNorm).limit(1).get();
        if (!contactSnap.empty) {
          await contactSnap.docs[0].ref.update({
            handoff: true,
            handoffAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          console.log(`Inbound reply: ${senderNorm} → marked as handoff`);
        } else {
          console.log(`Inbound reply: ${senderNorm} — contact not found in DB`);
        }
      }
    } catch (err) {
      console.error("Webhook inbound reply error:", err);
    }
  }

  // Spam complaint — príjemca označil ako spam → blacklist
  if (eventType === "email.complained") {
    try {
      await db.collection("blacklist").doc(emailLower).set({
        value: emailLower,
        type: "spam_complaint",
        reason: "Príjemca označil email ako spam (Resend complaint)",
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      const contactSnap = await db.collection("contacts")
        .where("email", "==", emailLower).limit(1).get();
      let contactName = "";
      let subject = "";
      if (!contactSnap.empty) {
        contactName = contactSnap.docs[0].data().name || "";
        subject = contactSnap.docs[0].data().subject || "";
        await contactSnap.docs[0].ref.update({
          sent: true,
          error: "Spam complaint — auto-blacklisted via Resend webhook",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      await db.collection("email_logs").add({
        success: false,
        event: "spam_complaint",
        contactEmail: emailLower,
        contactName,
        subject,
        error: `Spam complaint (Resend: ${event?.data?.feedback_type || "abuse"})`,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        date: getTodayDateString(),
      });
      console.log(`Resend complaint: ${emailLower} auto-blacklisted`);
    } catch (err) {
      console.error("Webhook complaint blacklist error:", err);
    }
  }

  res.status(200).send("ok");
});

// ─────────────────────────────────────────────────────────────────────────────
// REPORTING STATS
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// OPT-OUT HANDLER — príjemca klikne link → blacklist + landing page
// ─────────────────────────────────────────────────────────────────────────────
export const handleOptOut = functions.https.onRequest(async (req, res) => {
  const email = (req.query.email as string || "").trim().toLowerCase();
  if (email && email.includes("@")) {
    try {
      await db.collection("blacklist").doc(normalizeEmail(email)).set({
        value: normalizeEmail(email),
        type: "opt_out",
        reason: "Príjemca klikol na odhlasovací link",
        addedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      const contactSnap = await db.collection("contacts")
        .where("email", "==", normalizeEmail(email)).limit(1).get();
      if (!contactSnap.empty) {
        await contactSnap.docs[0].ref.update({
          sent: true,
          error: "Opt-out — odhlásený cez link",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      console.log(`Opt-out: ${email} blacklisted`);
    } catch (err) {
      console.error("Opt-out error:", err);
    }
  }
  res.redirect(301, "https://global-email-script.web.app/optout.html");
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST IMAP CONNECTION
// ─────────────────────────────────────────────────────────────────────────────
export const testImapConnection = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

  // UI ukladá IMAP do settings/imap (host, port, user, pass) — rovnako ako checkInboundReplies.
  const imapDoc = await db.collection("settings").doc("imap").get();
  let host: string | undefined;
  let port = 993;
  let user: string | undefined;
  let pass: string | undefined;

  if (imapDoc.exists) {
    const im = imapDoc.data() as { host?: string; port?: number; user?: string; pass?: string };
    host = im.host;
    port = im.port || 993;
    user = im.user;
    pass = im.pass;
  }

  // Spätná kompatibilita: staršie nasadenia mohli mať imap* priamo na settings/smtp
  if (!host || !user || !pass) {
    const smtpDoc = await db.collection("settings").doc("smtp").get();
    if (smtpDoc.exists) {
      const smtp = smtpDoc.data() as SmtpSettings;
      host = host || smtp.imapHost;
      port = smtp.imapPort || port;
      user = user || smtp.imapUser;
      pass = pass || smtp.imapPass;
    }
  }

  if (!host || !user || !pass) {
    throw new functions.https.HttpsError("invalid-argument", "IMAP nastavenia nie sú vyplnené (ulož nastavenia s vyplneným IMAP blokom)");
  }

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
    tls: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const status = await client.status("INBOX", { messages: true, unseen: true });
    await client.logout();
    return {
      success: true,
      message: `Pripojenie úspešné — INBOX: ${status.messages} správ, ${status.unseen} neprečítaných`,
    };
  } catch (err: any) {
    return { success: false, message: `Chyba: ${err.message || err}` };
  }
});

export const getReportingStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

  const contactsSnap = await db.collection("contacts").get();
  const blacklistSnap = await db.collection("blacklist").get();

  const now = Date.now();
  const day30ago = now - 30 * 24 * 60 * 60 * 1000;

  let totalSent = 0;
  let delivered = 0;
  let hardBounce = 0;
  let softBounce = 0;
  let complaint = 0;
  let handoffCount = 0;
  const subjectMap: Record<string, { sent: number; delivered: number; bounced: number; handoff: number }> = {};
  const dailyMap: Record<string, number> = {};

  contactsSnap.forEach(doc => {
    const d = doc.data();

    // Count handoffs across all contacts (not just sent)
    if (d.handoff) handoffCount++;

    if (!d.sent) return;

    totalSent++;

    // Delivery status
    if (d.deliveryStatus === "delivered") delivered++;
    else if (d.deliveryStatus === "bounced") hardBounce++;
    else if (d.deliveryStatus === "complained") complaint++;
    else if ((d.softBounceCount || 0) > 0) softBounce++;

    // Per subject stats
    const subj: string = d.subject || "(bez predmetu)";
    if (!subjectMap[subj]) subjectMap[subj] = { sent: 0, delivered: 0, bounced: 0, handoff: 0 };
    subjectMap[subj].sent++;
    if (d.deliveryStatus === "delivered") subjectMap[subj].delivered++;
    if (d.deliveryStatus === "bounced") subjectMap[subj].bounced++;
    if (d.handoff) subjectMap[subj].handoff++;

    // 30-day daily activity
    if (d.sentAt) {
      const sentMs = d.sentAt.toMillis ? d.sentAt.toMillis() : 0;
      if (sentMs >= day30ago) {
        const dateKey = new Date(sentMs).toISOString().slice(0, 10);
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1;
      }
    }
  });

  // Blacklist breakdown
  let blacklistBounce = 0;
  let blacklistComplaint = 0;
  let blacklistManual = 0;
  blacklistSnap.forEach(doc => {
    const t = doc.data().type || "";
    if (t === "hard_bounce") blacklistBounce++;
    else if (t === "spam_complaint") blacklistComplaint++;
    else blacklistManual++;
  });

  // Subject list sorted by sent desc
  const subjects = Object.entries(subjectMap)
    .map(([subject, s]) => ({
      subject,
      sent: s.sent,
      delivered: s.delivered,
      bounced: s.bounced,
      handoff: s.handoff,
      successRate: s.sent > 0 ? Math.round((s.delivered / s.sent) * 100) : null,
      responseRate: s.sent > 0 ? +((s.handoff / s.sent) * 100).toFixed(1) : null,
    }))
    .sort((a, b) => b.sent - a.sent);

  const deliveryRate = totalSent > 0 ? Math.round((delivered / totalSent) * 100) : null;
  const bounceRate = totalSent > 0 ? +((hardBounce / totalSent) * 100).toFixed(2) : null;
  const complaintRate = totalSent > 0 ? +((complaint / totalSent) * 100).toFixed(2) : null;
  const responseRate = totalSent > 0 ? +((handoffCount / totalSent) * 100).toFixed(1) : null;

  return {
    totalSent,
    delivered,
    hardBounce,
    softBounce,
    complaint,
    handoffCount,
    responseRate,
    deliveryRate,
    bounceRate,
    complaintRate,
    blacklist: { bounce: blacklistBounce, complaint: blacklistComplaint, manual: blacklistManual },
    subjects,
    dailyActivity: dailyMap,
  };
});

export const domainHealthCheck = functions.pubsub.schedule("every 6 hours").onRun(async () => {
  const smtpDoc = await db.collection("settings").doc("smtp").get();
  if (!smtpDoc.exists) return;

  const smtp = smtpDoc.data() as SmtpSettings;
  if (!smtp.resendApiKey || !smtp.user) return;

  let reputation = "unknown";
  let domainName = "";
  try {
    const resendClient = new Resend(smtp.resendApiKey);
    const { data: domainsData, error } = await resendClient.domains.list();
    if (!error && domainsData?.data?.length) {
      const domain = domainsData.data[0];
      reputation = (domain as any).reputation || "healthy";
      domainName = domain.name || "";
    }
  } catch (e) {
    console.error("domainHealthCheck: Resend API error", e);
    return;
  }

  if (reputation === "healthy") {
    await db.collection("settings").doc("domainHealth").set({ alertSent: false, reputation, checkedAt: admin.firestore.FieldValue.serverTimestamp() });
    return;
  }

  // Non-healthy — pause campaign + send alert (max once per degraded period)
  const healthDoc = await db.collection("settings").doc("domainHealth").get();
  if (healthDoc.exists && healthDoc.data()?.alertSent === true) return;

  // Pause the campaign
  const campaignDoc = await db.collection("settings").doc("campaign").get();
  const wasActive = campaignDoc.exists && campaignDoc.data()?.active === true;
  if (wasActive) {
    await db.collection("settings").doc("campaign").update({ active: false });
    console.log(`domainHealthCheck: campaign paused due to reputation=${reputation}`);
  }

  const fromAddr = smtp.resendFrom || smtp.from || smtp.user;
  const repLabel = reputation === "low" ? "⚠️ Nízka (Low)" : "🔴 Kritická (Critical)";
  const campaignNote = wasActive
    ? "\n\nKampaň bola automaticky POZASTAVENÁ. Spustite ju znovu manuálne v EMIL až po obnovení reputácie."
    : "";
  await sendMail(smtp, {
    from: fromAddr,
    to: smtp.user,
    subject: `EMIL Alert: Reputácia domény ${domainName} klesla — kampaň pozastavená`,
    text: `Dobrý deň,\n\nReputácia vašej domény ${domainName} v Resende klesla na: ${repLabel}.${campaignNote}\n\nSkontrolujte Resend dashboard a reporting v EMIL.\n\nEMIL`,
  });

  await db.collection("settings").doc("domainHealth").set({ alertSent: true, reputation, campaignPaused: wasActive, checkedAt: admin.firestore.FieldValue.serverTimestamp() });
  console.log(`domainHealthCheck: alert sent for ${domainName} (${reputation}), campaignPaused=${wasActive}`);
});

export const getResendStatus = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Must be logged in");

  const smtpDoc = await db.collection("settings").doc("smtp").get();
  if (!smtpDoc.exists) throw new functions.https.HttpsError("not-found", "Settings not configured");

  const smtp = smtpDoc.data() as SmtpSettings;
  if (!smtp.resendApiKey) throw new functions.https.HttpsError("failed-precondition", "Resend API key not set");

  // Fetch domain list from Resend API
  let domainStatus: string = "unknown";
  let domainReputation: string = "unknown";
  let domainName: string = "";
  try {
    const resendClient = new Resend(smtp.resendApiKey);
    const { data: domainsData, error } = await resendClient.domains.list();
    if (!error && domainsData && domainsData.data && domainsData.data.length > 0) {
      const domain = domainsData.data[0];
      domainStatus = domain.status || "unknown";
      domainReputation = (domain as any).reputation || "healthy";
      domainName = domain.name || "";
    }
  } catch (e) {
    console.error("Resend domain fetch error:", e);
  }

  // Count emails sent this calendar month from Firestore
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const contactsSnap = await db.collection("contacts").get();

  let sentThisMonth = 0;
  let sentToday = 0;
  const todayStr = now.toISOString().slice(0, 10);
  const monthStartMs = monthStart.getTime();

  contactsSnap.forEach(doc => {
    const d = doc.data();
    if (!d.sent || !d.sentAt) return;
    const sentMs = d.sentAt.toMillis ? d.sentAt.toMillis() : 0;
    if (sentMs >= monthStartMs) {
      sentThisMonth++;
      const dayStr = new Date(sentMs).toISOString().slice(0, 10);
      if (dayStr === todayStr) sentToday++;
    }
  });

  return {
    domain: {
      name: domainName,
      status: domainStatus,
      reputation: domainReputation,
    },
    credit: {
      sentThisMonth,
      sentToday,
      monthlyLimit: 3000,
      dailyLimit: 100,
    },
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL LOGS
// ─────────────────────────────────────────────────────────────────────────────
export const getEmailLogs = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in");
  }
  const limit = Math.min(data?.limit || 100, 200);
  const snap = await db.collection("email_logs")
    .orderBy("sentAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map(d => {
    const row = d.data();
    return {
      id: d.id,
      event: row.event || (row.success ? "sent" : "error"),
      contactName: row.contactName || null,
      contactEmail: row.contactEmail || null,
      subject: row.subject || null,
      bodyPreview: row.bodyPreview || null,
      error: row.error || null,
      sentAt: row.sentAt ? row.sentAt.toDate().toISOString() : null,
    };
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// IMAP INBOUND — automatický handoff pri odpovedi kontaktu
// ─────────────────────────────────────────────────────────────────────────────
export const checkInboundReplies = functions.pubsub.schedule("every 15 minutes").onRun(async () => {
  const imapDoc = await db.collection("settings").doc("imap").get();
  if (!imapDoc.exists) {
    console.log("checkInboundReplies: IMAP not configured, skipping");
    return;
  }

  const imap = imapDoc.data() as { host: string; port: number; user: string; pass: string };
  if (!imap.host || !imap.user || !imap.pass) {
    console.log("checkInboundReplies: incomplete IMAP settings, skipping");
    return;
  }

  const client = new ImapFlow({
    host: imap.host,
    port: imap.port || 993,
    secure: true,
    auth: { user: imap.user, pass: imap.pass },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");

    try {
      // Hľadáme neprecítané emaily z posledných 24 hodín
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const messages = await client.search({ seen: false, since });

      if (!messages || messages.length === 0) {
        console.log("checkInboundReplies: no new unseen messages");
        return;
      }

      console.log(`checkInboundReplies: found ${messages.length} unseen message(s)`);

      for await (const msg of client.fetch(messages, { envelope: true })) {
        const fromAddr = msg.envelope?.from?.[0];
        if (!fromAddr) continue;

        const fromEmail = normalizeEmail(fromAddr.address || "");
        if (!fromEmail) continue;

        // Skontroluj či je odosielateľ v kontaktoch
        const contactSnap = await db.collection("contacts")
          .where("email", "==", fromEmail).limit(1).get();

        if (!contactSnap.empty) {
          const contact = contactSnap.docs[0];
          const data = contact.data();
          // Označ len ak ešte nie je handoff
          if (!data.handoff) {
            await contact.ref.update({
              handoff: true,
              handoffAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`checkInboundReplies: ${fromEmail} → handoff`);
          }
        }

        // Označ správu ako prečítanú aby sme ju nespracúvali znova
        await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true });
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (err) {
    console.error("checkInboundReplies error:", err);
    try { await client.logout(); } catch (_) { /* ignore */ }
  }
});
