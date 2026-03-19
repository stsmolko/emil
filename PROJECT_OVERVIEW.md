# 🎯 Global Mailer - Kompletný Prehľad

## 📁 Štruktúra projektu

```
global-mailer/
│
├── 📄 Dokumentácia
│   ├── README.md              → Hlavná dokumentácia s features a setup
│   ├── QUICKSTART.md          → Rýchly štart za 10 minút
│   ├── DOCS.md                → Technická dokumentácia
│   ├── SCRIPTS.md             → Popis utility skriptov
│   └── PROJECT_OVERVIEW.md    → Tento súbor
│
├── 🔧 Konfigurácia
│   ├── firebase.json          → Firebase projekt konfigurácia
│   ├── .firebaserc            → Firebase projekt ID
│   ├── firestore.rules        → Firestore bezpečnostné pravidlá
│   ├── firestore.indexes.json → Database indexy
│   ├── .gitignore             → Git ignore patterns
│   ├── .env.example           → Environment variables template
│   └── package.json           → Root package.json (helper scripts)
│
├── 🌐 Frontend (public/)
│   ├── index.html             → Single Page Application
│   │   ├── Login screen
│   │   ├── Dashboard (stats, contacts table)
│   │   └── Settings (SMTP config)
│   └── js/
│       └── app.js             → Frontend logic + Firebase SDK
│           ├── Authentication
│           ├── Firestore operations
│           ├── Real-time listeners
│           └── CSV import
│
├── ⚡ Backend (functions/)
│   ├── package.json           → Functions dependencies
│   ├── tsconfig.json          → TypeScript config
│   └── src/
│       └── index.ts           → Cloud Functions
│           ├── smartScheduler    → Cron job (každých 30 min)
│           └── getStats          → HTTP callable function
│
├── 🛠️ Utility Scripts
│   ├── setup.sh               → Auto setup & deploy
│   ├── test-smtp.sh           → Test SMTP connection
│   ├── backup-firestore.sh    → Backup databázy
│   ├── monitor.sh             → CLI monitoring dashboard
│   └── reset-contacts.sh      → Reset kontaktov na "neodoslané"
│
└── 📊 Data
    └── sample-contacts.csv    → Ukážkový CSV súbor
```

---

## 🏗️ Architektúra

### Tech Stack
```
┌─────────────────────────────────────┐
│         USER INTERFACE              │
│   HTML5 + Tailwind CSS + JS        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      FIREBASE SERVICES              │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │ Authentication│  │  Hosting    │ │
│  └──────────────┘  └─────────────┘ │
│                                     │
│  ┌──────────────┐  ┌─────────────┐ │
│  │  Firestore   │  │  Functions  │ │
│  │   (NoSQL)    │  │  (Node.js)  │ │
│  └──────────────┘  └─────────────┘ │
└─────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      EXTERNAL SERVICES              │
│                                     │
│  ┌──────────────────────────────┐  │
│  │   SMTP Server (Gmail, etc)   │  │
│  │      via Nodemailer          │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Data Flow

#### 1. User Authentication
```
User → Login Form → Firebase Auth → onAuthStateChanged → Load Dashboard
```

#### 2. Contact Management
```
User Input → addDoc() → Firestore 'contacts' → Real-time Listener → Update UI
CSV Upload → Parse → Batch addDoc() → Firestore → Update UI
```

#### 3. Smart Email Sending
```
Cron Trigger (každých 30 min)
    ↓
Check Working Hours (7-21h)
    ↓
Check Daily Limit (<5)
    ↓
Fetch Random Unsent Contact
    ↓
Wait Random Delay (60-120s)
    ↓
Fetch SMTP Settings from Firestore
    ↓
Get Random Subject
    ↓
Send Email via Nodemailer
    ↓
Update Contact (sent: true)
    ↓
Update Stats + Logs
```

---

## 🗄️ Database Schema

### Firestore Collections

#### `contacts`
```javascript
{
  email: "jan@example.com",
  name: "Ján Novák",
  sent: false,
  sentAt: Timestamp | null,
  subject: "Predmet emailu" | null,
  error: "Error message" | null,
  createdAt: Timestamp
}
```

#### `settings/smtp`
```javascript
{
  host: "smtp.gmail.com",
  port: 587,
  user: "user@gmail.com",
  pass: "app_password",
  from: "sender@gmail.com"
}
```

#### `settings/email`
```javascript
{
  subjects: [
    "Predmet 1",
    "Predmet 2",
    "Predmet 3"
  ],
  emailBody: "Ahoj {{name}},\n\nText emailu..."
}
```

#### `stats/daily`
```javascript
{
  sentToday: 3,
  lastResetDate: "2024-01-15"
}
```

#### `email_logs`
```javascript
{
  success: true,
  error: null,
  sentAt: Timestamp,
  date: "2024-01-15"
}
```

---

## 🔐 Bezpečnosť

### Firestore Rules
```javascript
// Všetky kolekcie chránené autentifikáciou
match /contacts/{id} {
  allow read, write: if request.auth != null;
}
```

### Credentials Storage
- **Aktuálne:** SMTP credentials v Firestore
- **Odporúčané pre production:** Firebase Secret Manager

```bash
firebase functions:secrets:set SMTP_PASSWORD
```

---

## ⚙️ Konfigurovateľné parametre

### Cloud Function Settings
| Parameter | Default | Popis |
|-----------|---------|-------|
| Schedule | `every 30 minutes` | Frekvencia spúšťania |
| Timezone | `Europe/Bratislava` | Časové pásmo |
| Working Hours Start | `7` | Začiatok pracovného času |
| Working Hours End | `21` | Koniec pracovného času |
| Daily Limit | `5` | Max emailov/deň |
| Random Delay Min | `60000ms` (1min) | Min delay pred odoslaním |
| Random Delay Max | `120000ms` (2min) | Max delay pred odoslaním |

### Firebase Config
V `public/js/app.js`:
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

---

## 📊 Features Checklist

### ✅ Implemented
- [x] Firebase Authentication (Email/Password)
- [x] Real-time Dashboard s štatistikami
- [x] Contacts management (CRUD)
- [x] CSV import
- [x] SMTP konfigurácia (web UI)
- [x] Smart Scheduler (Cloud Function)
- [x] Working hours check (7-21h)
- [x] Daily limit (5 emails/deň)
- [x] Random contact selection
- [x] Human-like behavior (random delays)
- [x] Subject rotation
- [x] Email logging
- [x] Error handling
- [x] Dark mode design
- [x] Responsive layout
- [x] Real-time updates (Firestore listeners)

### 🚀 Možné vylepšenia
- [ ] Multi-user support (každý user vlastné kontakty)
- [ ] HTML email templates
- [ ] Email attachments
- [ ] A/B testing predmetov
- [ ] Analytics dashboard (open rate, click rate)
- [ ] Scheduled campaigns (pick specific date/time)
- [ ] Email personalization (viac premenných ako {{name}})
- [ ] Contact groups/tags
- [ ] Export štatistík (CSV/PDF)
- [ ] Webhook notifications
- [ ] SMS fallback
- [ ] API endpoints pre integrácie
- [ ] Mobile app (React Native / Flutter)

---

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Firebase projekt vytvorený
- [ ] Authentication aktivovaná (Email/Password)
- [ ] Firestore database aktivovaná
- [ ] Blaze plan aktivovaný (pre Functions)
- [ ] Firebase CLI nainštalované
- [ ] Node.js v18+ nainštalované

### Konfigurácia
- [ ] `.firebaserc` aktualizovaný (project ID)
- [ ] `public/js/app.js` aktualizovaný (firebaseConfig)
- [ ] `functions/` dependencies nainštalované (`npm install`)
- [ ] Functions built (`npm run build`)

### Deploy
```bash
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only hosting
```

### Post-deployment
- [ ] Prvý používateľ vytvorený (Firebase Console)
- [ ] SMTP konfigurácia nastavená (cez web UI)
- [ ] Test kontakty pridané
- [ ] Scheduler funkcie overené (logy)
- [ ] Test email odoslaný

---

## 📈 Monitoring & Maintenance

### Denné
```bash
./monitor.sh --watch
```
- Sleduj počet odoslaných emailov
- Kontroluj chyby v logoch

### Týždenné
```bash
./backup-firestore.sh
```
- Záloha databázy
- Review email delivery rate
- Skontroluj SMTP quota

### Mesačné
- Analyze Firebase costs
- Update dependencies (`npm update`)
- Security audit (Firestore rules)
- Performance review

---

## 💰 Cost Estimate

### Firebase Free Tier (Blaze Plan)
| Service | Free Tier | Usage (5 emails/deň) | Cost |
|---------|-----------|----------------------|------|
| Firestore | 50K reads, 20K writes | ~10K/mesiac | $0.00 |
| Functions | 2M invokácií | 1,440/mesiac (scheduler) | $0.00 |
| Hosting | 10GB storage, 360MB/deň | <100MB | $0.00 |
| **Total** | | | **~$0.00 - $0.50/mesiac** |

### Scaling (50 emails/deň)
| Service | Usage | Estimated Cost |
|---------|-------|----------------|
| Firestore | ~100K operations | $0.00 |
| Functions | 1,440 invokácií | $0.00 |
| Hosting | <500MB | $0.00 |
| **Total** | | **~$0.00 - $1.00/mesiac** |

---

## 🐛 Common Issues & Solutions

| Problém | Riešenie |
|---------|----------|
| "Functions require Blaze plan" | Upgrade na Blaze plan v Firebase Console |
| "SMTP Authentication failed" | Použiť App Password, nie bežné heslo |
| "No contacts found" | Pridaj aspoň 1 kontakt cez Dashboard |
| Scheduler nefunguje | Check logy: `firebase functions:log` |
| Firestore permission denied | Overiť auth stav + firestore.rules |
| Deploy failed | `cd functions && npm run build` |

---

## 📞 Support & Resources

### Dokumentácia
- [Firebase Docs](https://firebase.google.com/docs)
- [Cloud Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Docs](https://firebase.google.com/docs/firestore)
- [Nodemailer Docs](https://nodemailer.com/)

### Local Docs
- `README.md` - Setup guide
- `QUICKSTART.md` - 10-minute tutorial
- `DOCS.md` - Technical deep-dive
- `SCRIPTS.md` - Utility scripts

### Commands
```bash
firebase --help
firebase functions:log
firebase emulators:start
./monitor.sh --watch
```

---

## 🎓 Learning Resources

### Firebase
- [Firebase YouTube Channel](https://www.youtube.com/firebase)
- [Firebase Codelab](https://firebase.google.com/codelabs)

### Cloud Functions
- [Schedule Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Callable Functions](https://firebase.google.com/docs/functions/callable)

### Firestore
- [Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## 📝 Changelog

### v1.0.0 (Initial Release)
- ✅ Complete Firebase setup
- ✅ Authentication system
- ✅ Dashboard with real-time stats
- ✅ Contact management (add, import CSV, delete)
- ✅ SMTP configuration
- ✅ Smart Scheduler (Cloud Function)
- ✅ Dark mode design
- ✅ Utility scripts
- ✅ Complete documentation

---

**Projekt vytvorený:** 2024-01-15  
**Posledná aktualizácia:** 2024-01-15  
**Verzia:** 1.0.0

---

✨ **Happy Automating!** ✨
