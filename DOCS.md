# 📧 Global Mailer - Technická Dokumentácia

## Architektúra

### Frontend Layer
```
public/
├── index.html          → Single Page Application (SPA)
└── js/
    └── app.js          → Firebase SDK + Business Logic
```

**Použité technológie:**
- HTML5 + Tailwind CSS (cez CDN)
- Firebase SDK v10 (ES Modules)
- Vanilla JavaScript (modulárny prístup)

### Backend Layer
```
functions/
└── src/
    └── index.ts        → Cloud Functions (TypeScript)
```

**Funkcie:**
1. `smartScheduler` - Cron job (každých 30 min)
2. `getStats` - Callable funkcia pre štatistiky

### Database Schema

#### Collection: `contacts`
```typescript
{
  email: string,              // Emailová adresa
  name: string,               // Meno kontaktu
  sent: boolean,              // Či bol email odoslaný
  sentAt?: Timestamp,         // Kedy bol odoslaný
  subject?: string,           // Aký bol predmet emailu
  error?: string,             // Prípadná chyba
  createdAt: Timestamp        // Kedy bol kontakt vytvorený
}
```

#### Collection: `settings`

**Document: `smtp`**
```typescript
{
  host: string,               // SMTP server
  port: number,               // Port (587, 465)
  user: string,               // SMTP username
  pass: string,               // SMTP password (⚠️ bezpečnosť!)
  from: string                // From email address
}
```

**Document: `email`**
```typescript
{
  subjects: string[],         // Pole predmetov
  emailBody: string           // Template tela emailu
}
```

#### Collection: `stats`

**Document: `daily`**
```typescript
{
  sentToday: number,          // Počet odoslaných dnes
  lastResetDate: string       // YYYY-MM-DD (pre reset)
}
```

#### Collection: `email_logs`
```typescript
{
  success: boolean,           // Úspešné odoslanie?
  error: string | null,       // Chybová správa
  sentAt: Timestamp,          // Timestamp
  date: string                // YYYY-MM-DD
}
```

## 🔄 Flow diagramy

### Prihlásenie používateľa
```
User Input (email/pass)
    ↓
signInWithEmailAndPassword()
    ↓
onAuthStateChanged() trigger
    ↓
Load Dashboard + Contacts
```

### Smart Scheduler Flow
```
Cron Trigger (každých 30 min)
    ↓
Check: Pracovný čas? (7-21h)
    ↓ YES
Check: Denný limit? (<5)
    ↓ YES
Get náhodný neodoslaný kontakt
    ↓
Náhodný delay (60-120s)
    ↓
Fetch SMTP settings
    ↓
Get náhodný subject
    ↓
Send email via Nodemailer
    ↓
Update contact.sent = true
    ↓
Update stats + logs
```

### Import CSV Flow
```
User vyberie CSV súbor
    ↓
FileReader načíta text
    ↓
Split by newlines
    ↓
For každý riadok (skip header):
    Parse email, name
    ↓
    addDoc() to Firestore
    ↓
Show success message
```

## 🔐 Bezpečnosť

### Firestore Rules
```javascript
// Všetky kolekcie sú chránené autentifikáciou
match /contacts/{id} {
  allow read, write: if request.auth != null;
}
```

### SMTP Credentials
**Súčasné riešenie:** Uložené v Firestore (document `settings/smtp`)

⚠️ **Bezpečnostné riziko:** Firestore rules umožňujú čítať SMTP heslo pre prihlásených používateľov.

**Odporúčané riešenie:**
```bash
# Použiť Firebase Secret Manager
firebase functions:secrets:set SMTP_PASSWORD

# V functions/src/index.ts:
import { defineSecret } from "firebase-functions/params";
const smtpPassword = defineSecret("SMTP_PASSWORD");

export const smartScheduler = functions
  .runWith({ secrets: [smtpPassword] })
  .pubsub.schedule(...)
```

### Environment Variables
Pre local development:
```bash
# functions/.env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=user@gmail.com
SMTP_PASS=app_password
```

## ⚙️ Konfigurácia

### Firebase Config
`public/js/app.js` riadok 18-25:

```javascript
const firebaseConfig = {
    apiKey: "...",
    authDomain: "...",
    projectId: "...",
    storageBucket: "...",
    messagingSenderId: "...",
    appId: "..."
};
```

Získaj z: Firebase Console → Project Settings → Your apps → Firebase SDK snippet

### Cloud Functions Environment

**Timezone:**
```typescript
.timeZone("Europe/Bratislava")
```

**Schedule:**
```typescript
.schedule("every 30 minutes")

// Možnosti:
// "every 5 minutes"
// "every 1 hours"
// "0 9 * * *"  (každý deň o 9:00)
```

**Daily Limit:**
```typescript
const DAILY_LIMIT = 5;  // Zmeň na požadovaný počet
```

**Working Hours:**
```typescript
const WORKING_HOURS_START = 7;   // 7:00
const WORKING_HOURS_END = 21;    // 21:00
```

**Random Delay:**
```typescript
const getRandomDelay = (): number => {
  // Min: 60s (60000ms), Max: 120s (120000ms)
  return Math.floor(Math.random() * 120000) + 60000;
};
```

## 🧪 Testing

### Local Emulators
```bash
# Spustiť Firebase emulators
firebase emulators:start

# Špecifické emulators
firebase emulators:start --only functions,firestore
```

### Manual Testing

**Test Smart Scheduler lokálne:**
```typescript
// functions/src/index.ts - dočasne zmeň:
.schedule("every 1 minutes")  // Test každú minútu

// A/alebo odstráň time check:
// if (!isWorkingHours()) {
//   return null;  // Zakomentuj
// }
```

**Test SMTP connection:**
```typescript
// Pridaj test funkciu do functions/src/index.ts:
export const testEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new Error("Unauthorized");
  
  const transporter = nodemailer.createTransport({...});
  
  await transporter.sendMail({
    from: "test@example.com",
    to: data.email,
    subject: "Test Email",
    text: "This is a test"
  });
  
  return { success: true };
});
```

## 📊 Monitoring

### Cloud Functions Logs
```bash
# Real-time logs
firebase functions:log --only smartScheduler

# Všetky logy
firebase functions:log
```

### Firestore Data
Firebase Console → Firestore Database → Collections

**Užitočné queries:**
```javascript
// Všetky neodoslané kontakty
db.collection('contacts').where('sent', '==', false)

// Dnešné logy
const today = new Date().toISOString().split('T')[0];
db.collection('email_logs').where('date', '==', today)

// Chybné odoslania
db.collection('email_logs').where('success', '==', false)
```

## 🚀 Deployment

### Prvé nasadenie
```bash
# 1. Build functions
cd functions && npm run build && cd ..

# 2. Deploy všetko
firebase deploy

# Alebo postupne:
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only hosting
```

### Update len funkcií
```bash
firebase deploy --only functions

# Len špecifická funkcia
firebase deploy --only functions:smartScheduler
```

### Update len hostingu
```bash
firebase deploy --only hosting
```

### Rollback
```bash
# Zoznam verzií
firebase hosting:channel:list

# Rollback na predchádzajúcu verziu
firebase hosting:rollback
```

## 🐛 Troubleshooting

### Problém: Function sa nespúšťa

**Riešenie:**
1. Skontroluj logy: `firebase functions:log`
2. Overiť Blaze plan: Functions vyžadujú platený plán
3. Skontroluj timezone v Cloud Scheduler (GCP Console)

### Problém: SMTP Error "Invalid login"

**Riešenie:**
1. Gmail: Použiť App Password, nie hlavné heslo
2. Zapnúť 2FA na Google účte
3. Skontrolovať port (587 pre TLS, 465 pre SSL)

### Problém: Contacts sa neukladajú

**Riešenie:**
1. Skontroluj Firestore rules
2. Overiť autentifikáciu v prehliadači (Console → Application → IndexedDB)
3. Pozrieť browser console errors

### Problém: Stats sa neaktualizujú

**Riešenie:**
1. Skontroluj, či je `getStats` Cloud Function deployed
2. Overiť CORS nastavenia
3. Browser console: Skontroluj network tab

## 📈 Performance Optimization

### Firestore Indexes
```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "contacts",
      "fields": [
        { "fieldPath": "sent", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Cloud Functions Cold Start
```typescript
// Použiť minInstances pre kritické funkcie
export const smartScheduler = functions
  .runWith({
    minInstances: 1,  // Zabrániť cold starts
    timeoutSeconds: 540,
    memory: "256MB"
  })
  .pubsub.schedule(...)
```

### Frontend Optimization
- Tailwind CDN → Production: Použiť build verziu s PurgeCSS
- Firebase SDK → Import len potrebné moduly
- Implement pagination pre veľké tabuľky kontaktov

## 🔄 Údržba

### Denné
- Monitorovať email_logs kolekciu pre chyby
- Skontrolovať Cloud Functions execution count

### Týždenné
- Backup Firestore data
- Analyzovať email delivery rates
- Skontrolovať SMTP quota

### Mesačné
- Review Firebase costs
- Update dependencies
- Security audit

## 📚 Ďalšie zdroje

- [Firebase Documentation](https://firebase.google.com/docs)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Cloud Functions Scheduling](https://firebase.google.com/docs/functions/schedule-functions)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)

---

**Posledná aktualizácia:** 2024-01-15
