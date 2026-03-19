# 🔧 Troubleshooting Guide

Kompletný guide na riešenie bežných problémov s Global Mailer aplikáciou.

## 📋 Obsah

1. [Firebase Setup Issues](#firebase-setup-issues)
2. [Authentication Problems](#authentication-problems)
3. [Cloud Functions Errors](#cloud-functions-errors)
4. [SMTP Connection Issues](#smtp-connection-issues)
5. [Firestore Problems](#firestore-problems)
6. [Frontend Issues](#frontend-issues)
7. [Deployment Problems](#deployment-problems)
8. [Performance Issues](#performance-issues)

---

## 🔥 Firebase Setup Issues

### ❌ "Firebase project not found"

**Príčina:** `.firebaserc` obsahuje nesprávne project ID

**Riešenie:**
```bash
# Zisti svoje project ID
firebase projects:list

# Nastav správny projekt
firebase use your-project-id

# Alebo interaktívne
firebase use --add
```

### ❌ "Error: Permission denied"

**Príčina:** Nie si prihlásený do Firebase CLI

**Riešenie:**
```bash
# Prihlás sa
firebase login

# Force re-login
firebase login --reauth

# Overiť prihlásenie
firebase projects:list
```

### ❌ "Failed to get Firebase project"

**Príčina:** Firebase API nie je aktivované

**Riešenie:**
1. Choď do [Google Cloud Console](https://console.cloud.google.com/)
2. Vyber svoj projekt
3. APIs & Services → Enable APIs
4. Hľadaj a aktivuj:
   - Firebase Management API
   - Cloud Functions API
   - Cloud Firestore API

---

## 🔐 Authentication Problems

### ❌ "Email/Password provider is disabled"

**Príčina:** Authentication provider nie je aktivovaný

**Riešenie:**
1. Firebase Console → Authentication
2. Sign-in method tab
3. Email/Password → Enable
4. Save

### ❌ "User not found" alebo "Wrong password"

**Príčina:** Používateľ neexistuje alebo zlé heslo

**Riešenie:**
```bash
# Vytvor používateľa cez Console
Firebase Console → Authentication → Add user

# Alebo reset hesla
Firebase Console → Authentication → Users → ... → Reset password
```

### ❌ "auth/network-request-failed"

**Príčina:** Sieťový problém alebo CORS issue

**Riešenie:**
1. Skontroluj internet connection
2. Vyčisti browser cache
3. Skús iný browser
4. Skontroluj Firebase Console → Authentication → Settings → Authorized domains

```javascript
// V public/js/app.js - overiť správny authDomain
const firebaseConfig = {
    authDomain: "your-project-id.firebaseapp.com",  // Musí byť správne
    // ...
};
```

---

## ⚡ Cloud Functions Errors

### ❌ "Functions require Blaze plan"

**Príčina:** Projekt je na Spark (free) pláne

**Riešenie:**
```bash
# Upgrade v Firebase Console
Firebase Console → Upgrade → Select Blaze plan

# Alebo cez CLI
firebase projects:list
firebase use your-project-id
```

### ❌ "Function deployment failed"

**Príčina:** Build errors alebo missing dependencies

**Riešenie:**
```bash
# Skontroluj build
cd functions
npm run build

# Skontroluj errors
npm run build 2>&1 | grep error

# Re-install dependencies
rm -rf node_modules package-lock.json
npm install

# Deploy znova
cd ..
firebase deploy --only functions
```

### ❌ "smartScheduler is not running"

**Príčina:** Scheduler nie je aktivovaný alebo má errors

**Riešenie:**
```bash
# Skontroluj logy
firebase functions:log --only smartScheduler

# Skontroluj, či je deployed
firebase functions:list | grep smartScheduler

# Re-deploy
firebase deploy --only functions:smartScheduler

# Overiť v GCP Console
# Google Cloud Console → Cloud Scheduler → Jobs
```

### ❌ "Function timeout"

**Príčina:** Funkcia beží príliš dlho (default: 60s)

**Riešenie:**
```typescript
// functions/src/index.ts
export const smartScheduler = functions
  .runWith({
    timeoutSeconds: 540,  // Max 540s (9 min)
    memory: "256MB"
  })
  .pubsub.schedule("every 30 minutes")
  // ...
```

### ❌ "Memory limit exceeded"

**Príčina:** Funkcia potrebuje viac pamäte

**Riešenie:**
```typescript
export const smartScheduler = functions
  .runWith({
    memory: "512MB"  // Zvýš z 256MB na 512MB alebo 1GB
  })
  .pubsub.schedule(...)
```

---

## 📧 SMTP Connection Issues

### ❌ "Invalid login: 535-5.7.8 Username and Password not accepted"

**Príčina:** Nesprávne credentials alebo nie je App Password

**Riešenie pre Gmail:**
```
1. Zapni 2-Step Verification:
   Google Account → Security → 2-Step Verification → Turn on

2. Vytvor App Password:
   Google Account → Security → 2-Step Verification → App passwords
   → Select "Mail" and "Other device"
   → Generate
   → Copy 16-character code

3. V Global Mailer Settings:
   User: vas@gmail.com
   Pass: xxxx xxxx xxxx xxxx  (16-char code)
```

### ❌ "Connection timeout"

**Príčina:** Nesprávny port alebo firewall

**Riešenie:**
```javascript
// Test rôzne porty
Port 587 - TLS (odporúčané)
Port 465 - SSL
Port 25  - Unencrypted (neodporúčané)

// V Settings skús:
Host: smtp.gmail.com
Port: 587 alebo 465
```

### ❌ "ECONNREFUSED"

**Príčina:** SMTP server je nedostupný

**Riešenie:**
```bash
# Test SMTP connection
./test-smtp.sh

# Alebo manuálne test
telnet smtp.gmail.com 587

# Skontroluj DNS
nslookup smtp.gmail.com
```

### ❌ "Daily sending quota exceeded"

**Príčina:** Gmail má limit 500 emailov/deň (free account)

**Riešenie:**
- Použiť Google Workspace (limit: 2000/deň)
- Použiť dedicated SMTP service (SendGrid, Mailgun)
- Zníž daily limit v kóde

```typescript
// functions/src/index.ts
const DAILY_LIMIT = 5;  // Zníž podľa potreby
```

### ❌ "Relay access denied"

**Príčina:** SMTP server nepodporuje relay

**Riešenie:**
- Overiť, že "from" email je rovnaký ako SMTP user
- Použiť autorizovaný email provider

---

## 🗄️ Firestore Problems

### ❌ "Missing or insufficient permissions"

**Príčina:** Firestore rules blokujú prístup

**Riešenie:**
```bash
# Skontroluj rules
cat firestore.rules

# Re-deploy rules
firebase deploy --only firestore:rules

# Dočasne povoliť všetko (len pre testing!):
```

```javascript
// firestore.rules - TESTING ONLY
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // ⚠️ UNSAFE
    }
  }
}
```

### ❌ "Document not found"

**Príčina:** Document ID neexistuje

**Riešenie:**
```javascript
// V public/js/app.js - add error handling
const doc = await db.collection('settings').doc('smtp').get();
if (!doc.exists) {
  console.log('Settings not found, using defaults');
  // ... handle missing doc
}
```

### ❌ "Collection is empty"

**Príčina:** Žiadne dáta v kolekcii

**Riešenie:**
```bash
# Skontroluj v Console
Firebase Console → Firestore Database → Data

# Pridaj test data
# V Dashboard → Pridať kontakt
```

### ❌ "Index required for query"

**Príčina:** Chýba composite index

**Riešenie:**
```bash
# Error message obsahuje link na vytvorenie indexu
# Klikni na link v error message

# Alebo manuálne:
# Firebase Console → Firestore → Indexes → Create index

# Alebo deploy indexes
firebase deploy --only firestore:indexes
```

---

## 🌐 Frontend Issues

### ❌ "Firebase is not defined"

**Príčina:** Firebase SDK sa nenačítal

**Riešenie:**
```html
<!-- public/index.html - overiť script tag -->
<script type="module" src="js/app.js"></script>

<!-- Skontroluj CDN links v app.js -->
```

### ❌ "Stats not updating"

**Príčina:** getStats Cloud Function error

**Riešenie:**
```bash
# Skontroluj logy
firebase functions:log --only getStats

# Test funkcie
# Browser Console:
const getStats = firebase.functions().httpsCallable('getStats');
getStats().then(result => console.log(result.data));
```

### ❌ "Contacts table showing loader forever"

**Príčina:** Firestore listener error

**Riešenie:**
```javascript
// Browser Console (F12) - skontroluj errors
// public/js/app.js - add error handling:

onSnapshot(q, (snapshot) => {
  // ...
}, (error) => {
  console.error('Listener error:', error);
  contactsTable.innerHTML = `
    <tr><td colspan="5">Error loading contacts: ${error.message}</td></tr>
  `;
});
```

### ❌ "CSV import not working"

**Príčina:** Nesprávny CSV format

**Riešenie:**
```csv
// Správny format (sample-contacts.csv):
email,name
jan@example.com,Ján Novák
maria@example.com,Mária Kováčová

// Nesprávne:
email;name  ← Semicolon namiesto comma
"email","name"  ← Quoted headers
```

---

## 🚀 Deployment Problems

### ❌ "Deploy failed: HTTP Error: 404"

**Príčina:** API nie je aktivované

**Riešenie:**
```bash
# Aktivuj potrebné APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
gcloud services enable firebase.googleapis.com
```

### ❌ "Hosting URL not working"

**Príčina:** Hosting nie je deployed

**Riešenie:**
```bash
# Deploy hosting
firebase deploy --only hosting

# Skontroluj URL
firebase hosting:channel:list

# Overiť v Console
Firebase Console → Hosting → Dashboard
```

### ❌ "Functions deploy stuck"

**Príčina:** Large deployment alebo slow network

**Riešenie:**
```bash
# Cancel a skús znova
Ctrl+C

# Deploy postupne
firebase deploy --only functions:smartScheduler
firebase deploy --only functions:getStats

# Skontroluj internet connection
```

---

## ⚡ Performance Issues

### ❌ "Dashboard loads slowly"

**Príčina:** Veľké množstvo kontaktov

**Riešenie:**
```javascript
// public/js/app.js - pridaj pagination
const q = query(
  collection(db, 'contacts'), 
  orderBy('createdAt', 'desc'),
  limit(50)  // Načítaj len 50
);
```

### ❌ "Too many Firestore reads"

**Príčina:** Real-time listeners bez limitu

**Riešenie:**
```javascript
// Použiť limit()
const q = query(
  collection(db, 'contacts'),
  limit(100)
);

// Alebo use get() namiesto onSnapshot() pre static data
const snapshot = await getDocs(q);  // One-time read
```

### ❌ "Function cold starts"

**Príčina:** Funkcia nie je active

**Riešenie:**
```typescript
// functions/src/index.ts
export const smartScheduler = functions
  .runWith({
    minInstances: 1  // Keep 1 instance always warm
  })
  .pubsub.schedule(...)
```

---

## 🛠️ Utility Commands

### Debug Commands
```bash
# Všetky Firebase logy
firebase functions:log

# Len errors
firebase functions:log | grep ERROR

# Live tail
firebase functions:log -f

# Špecifická funkcia
firebase functions:log --only smartScheduler

# GCP Console logs (advanced)
gcloud logging read "resource.type=cloud_function" --limit 50
```

### Testing Commands
```bash
# Local emulators
firebase emulators:start

# Test SMTP
./test-smtp.sh

# Monitor
./monitor.sh --watch

# Reset contacts
./reset-contacts.sh
```

### Deploy Commands
```bash
# Everything
firebase deploy

# Only specific
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules

# Rollback
firebase hosting:rollback
```

---

## 📞 Ešte stále nefunguje?

### 1. Skontroluj základy
```bash
# Node.js version
node -v  # Mali by byť v18+

# Firebase CLI version
firebase --version  # Mali by byť v12+

# Login status
firebase login:list

# Project status
firebase projects:list
```

### 2. Kompletný reset
```bash
# 1. Vyčisti functions
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build

# 2. Re-deploy všetko
cd ..
firebase deploy

# 3. Vyčisti browser cache
# Chrome: Ctrl+Shift+Delete → Clear all
```

### 3. Check Firebase Status
- [Firebase Status Dashboard](https://status.firebase.google.com/)
- [Google Cloud Status](https://status.cloud.google.com/)

### 4. Get Help
```bash
# Firebase Support
https://firebase.google.com/support

# Stack Overflow
Tag: firebase, google-cloud-functions, firestore

# Firebase Community
https://firebase.google.com/community
```

---

## 📊 Diagnostic Checklist

Pred hlásením problému, skontroluj:

- [ ] Firebase CLI updated: `npm update -g firebase-tools`
- [ ] Node.js v18+: `node -v`
- [ ] Logged into Firebase: `firebase login:list`
- [ ] Correct project: `firebase use`
- [ ] Functions built: `cd functions && npm run build`
- [ ] Deployed: `firebase deploy`
- [ ] Firestore rules deployed: `firebase deploy --only firestore:rules`
- [ ] User created: Firebase Console → Authentication
- [ ] SMTP settings configured: Dashboard → Settings
- [ ] Browser console checked (F12)
- [ ] Function logs checked: `firebase functions:log`
- [ ] Firebase config correct: `public/js/app.js`

---

**Ak problém pretrváva, skontroluj dokumentáciu alebo vytvor issue s:**
1. Error message (full text)
2. Logs (`firebase functions:log`)
3. Browser console errors (F12)
4. Steps to reproduce
5. Expected vs actual behavior

---

✅ **Happy Debugging!**
