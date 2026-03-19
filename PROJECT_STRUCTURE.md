# 🌳 Global Mailer - Project Structure

```
global-mailer/
│
├── 📚 DOCUMENTATION (9 files, 2,400+ lines)
│   ├── FINAL_SUMMARY.md           ⭐ Začni tu - kompletný prehľad projektu
│   ├── QUICKSTART.md              🚀 10-min setup guide
│   ├── README.md                  📖 Hlavná dokumentácia
│   ├── DOCS.md                    🔧 Technická dokumentácia
│   ├── PROJECT_OVERVIEW.md        📊 Architektúra & prehľad
│   ├── SCRIPTS.md                 🛠️  Utility skripty guide
│   ├── EMAIL_TEMPLATES.md         📧 HTML email templates
│   ├── TROUBLESHOOTING.md         🐛 Riešenie problémov
│   ├── INDEX.md                   🗺️  Navigačný index
│   └── DEPLOYMENT_CHECKLIST.md    ✅ Deployment checklist
│
├── 🔧 CONFIGURATION (5 files)
│   ├── firebase.json              → Firebase projekt config
│   ├── .firebaserc                → Project ID
│   ├── firestore.rules            → Security rules (auth required)
│   ├── firestore.indexes.json     → Database indexes
│   ├── package.json               → Root package.json (helper scripts)
│   └── .env.example               → Environment variables template
│
├── 🛠️ UTILITY SCRIPTS (5 executable files)
│   ├── setup.sh                   🔄 Auto setup & deploy
│   ├── test-smtp.sh               📧 SMTP connection test
│   ├── backup-firestore.sh        💾 Database backup
│   ├── monitor.sh                 📊 CLI monitoring dashboard
│   └── reset-contacts.sh          🔄 Reset contacts to unsent
│
├── 🌐 FRONTEND (public/)
│   ├── index.html                 → SPA s dark mode (700+ lines)
│   │   ├── 🔐 Login Screen
│   │   ├── 📊 Dashboard (stats, CSV import, add contact)
│   │   └── ⚙️  Settings (SMTP config)
│   │
│   ├── css/                       → (empty - Tailwind CDN)
│   │
│   └── js/
│       └── app.js                 → Frontend logic (400+ lines)
│           ├── Firebase SDK imports
│           ├── Authentication
│           ├── Firestore operations (CRUD)
│           ├── Real-time listeners
│           ├── CSV import parser
│           └── Stats dashboard
│
├── ⚡ BACKEND (functions/)
│   ├── package.json               → Dependencies (firebase-admin, nodemailer)
│   ├── tsconfig.json              → TypeScript config
│   │
│   └── src/
│       └── index.ts               → Cloud Functions (250+ lines)
│           ├── smartScheduler     → Cron job (every 30 min)
│           │   ├── Working hours check (7-21h)
│           │   ├── Daily limit (5 emails/day)
│           │   ├── Random contact selection
│           │   ├── Human delay (60-120s)
│           │   ├── Subject rotation
│           │   ├── Email send (Nodemailer)
│           │   └── Stats & logging
│           │
│           └── getStats           → HTTP callable function
│               └── Real-time aggregation
│
└── 📊 SAMPLE DATA
    └── sample-contacts.csv        → 10 test contacts

```

---

## 📦 File Count Summary

| Category | Count | Lines |
|----------|-------|-------|
| **Documentation** | 10 | 2,400+ |
| **Configuration** | 6 | 100+ |
| **Frontend** | 2 | 1,100+ |
| **Backend** | 3 | 250+ |
| **Scripts** | 5 | 400+ |
| **Sample Data** | 1 | 10 |
| **TOTAL** | **27 files** | **4,260+ lines** |

---

## 🗄️ Database Structure (Firestore)

```
Firestore Database
│
├── 📁 contacts/
│   └── {contactId}
│       ├── email: string
│       ├── name: string
│       ├── sent: boolean
│       ├── sentAt: Timestamp
│       ├── subject: string
│       ├── error: string
│       └── createdAt: Timestamp
│
├── 📁 settings/
│   ├── smtp                       → SMTP configuration
│   │   ├── host: string
│   │   ├── port: number
│   │   ├── user: string
│   │   ├── pass: string
│   │   └── from: string
│   │
│   └── email                      → Email templates
│       ├── subjects: string[]
│       └── emailBody: string
│
├── 📁 stats/
│   └── daily
│       ├── sentToday: number
│       └── lastResetDate: string
│
└── 📁 email_logs/
    └── {logId}
        ├── success: boolean
        ├── error: string
        ├── sentAt: Timestamp
        └── date: string
```

---

## 🎯 Feature Map

```
GLOBAL MAILER
│
├── 🔐 AUTHENTICATION
│   ├── Firebase Auth (Email/Password)
│   ├── Login screen
│   ├── Session management
│   └── Logout
│
├── 📊 DASHBOARD
│   ├── Real-time stats (4 cards)
│   │   ├── Odoslané dnes
│   │   ├── Zostávajúce
│   │   ├── Chyby dnes
│   │   └── Celkom kontaktov
│   │
│   ├── CSV Import
│   │   ├── File picker
│   │   ├── Parser
│   │   └── Batch import to Firestore
│   │
│   ├── Add Contact Form
│   │   ├── Email input
│   │   ├── Name input
│   │   └── Submit to Firestore
│   │
│   └── Contacts Table
│       ├── Real-time updates
│       ├── Status badge (Čaká/Odoslané)
│       ├── Sent date
│       └── Delete action
│
├── ⚙️ SETTINGS
│   ├── SMTP Configuration
│   │   ├── Host
│   │   ├── Port
│   │   ├── User
│   │   ├── Password
│   │   └── From email
│   │
│   ├── Email Subjects
│   │   └── Multi-line input (rotation)
│   │
│   └── Email Body Template
│       └── {{name}} variable support
│
└── 🤖 SMART SCHEDULER (Cloud Function)
    ├── Cron Trigger (every 30 min)
    ├── Time Check (7-21h)
    ├── Limit Check (<5/day)
    ├── Random Contact Selection
    ├── Human Delay (60-120s)
    ├── SMTP Fetch
    ├── Subject Rotation
    ├── Email Send (Nodemailer)
    ├── Contact Update
    └── Stats & Logging
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         USER                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   LOGIN (Firebase)     │
        └────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│   DASHBOARD      │    │    SETTINGS      │
│                  │    │                  │
│ - View Stats     │    │ - SMTP Config    │
│ - Add Contacts   │    │ - Email Template │
│ - Import CSV     │    │ - Save to DB     │
│ - View Table     │    └──────────────────┘
└──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│           FIRESTORE DATABASE                │
│                                             │
│  contacts/ | settings/ | stats/ | logs/    │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│       CLOUD SCHEDULER (every 30 min)        │
│                                             │
│  1. Check time (7-21h)                      │
│  2. Check limit (<5)                        │
│  3. Select random contact                   │
│  4. Wait random delay                       │
│  5. Fetch SMTP settings                     │
│  6. Send email via Nodemailer               │
│  7. Update contact & stats                  │
└─────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│           SMTP SERVER (Gmail)               │
│                                             │
│           Email delivered ✉️                 │
└─────────────────────────────────────────────┘
```

---

## 🚀 Deployment Flow

```
┌─────────────────────────────────────────────────────┐
│  1. LOCAL DEVELOPMENT                               │
│     - Write code                                    │
│     - Test locally (emulators)                      │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  2. BUILD                                           │
│     - cd functions && npm run build                 │
│     - TypeScript → JavaScript                       │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  3. DEPLOY (firebase deploy)                        │
│     ├─ Firestore Rules                              │
│     ├─ Firestore Indexes                            │
│     ├─ Cloud Functions                              │
│     └─ Hosting (public/)                            │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  4. FIREBASE CLOUD                                  │
│     ├─ Hosting: https://project.web.app             │
│     ├─ Functions: us-central1                       │
│     ├─ Firestore: Multi-region                      │
│     └─ Auth: Global                                 │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│  5. PRODUCTION                                      │
│     ✅ Application live                              │
│     ✅ Scheduler running                             │
│     ✅ Users can access                              │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 UI Components Structure

```
INDEX.HTML
│
├── 🔐 LOGIN SCREEN
│   ├── Logo (gradient circle)
│   ├── Title "Global Mailer"
│   ├── Login Form
│   │   ├── Email input
│   │   ├── Password input
│   │   └── Submit button
│   └── Error message (hidden by default)
│
└── 📱 MAIN APP (hidden until auth)
    │
    ├── 🧭 NAVIGATION BAR
    │   ├── Logo + Title
    │   ├── Dashboard Tab
    │   ├── Settings Tab
    │   └── Logout Button
    │
    ├── 📊 DASHBOARD SECTION
    │   ├── Stats Cards (4 cards in grid)
    │   │   ├── Odoslané dnes (green)
    │   │   ├── Zostávajúce (blue)
    │   │   ├── Chyby dnes (red)
    │   │   └── Celkom kontaktov (purple)
    │   │
    │   ├── Import & Add Section (2 cards)
    │   │   ├── CSV Import Card
    │   │   │   ├── File input
    │   │   │   ├── Import button
    │   │   │   └── File name display
    │   │   │
    │   │   └── Add Contact Card
    │   │       ├── Email input
    │   │       ├── Name input
    │   │       └── Submit button
    │   │
    │   └── Contacts Table
    │       ├── Header (Email, Name, Status, Sent, Actions)
    │       ├── Real-time rows
    │       └── Delete buttons
    │
    └── ⚙️ SETTINGS SECTION (hidden by default)
        ├── SMTP Form
        │   ├── Host input
        │   ├── Port input
        │   ├── User input
        │   ├── Password input
        │   ├── From input
        │   ├── Subjects textarea
        │   ├── Email body textarea
        │   └── Save button
        └── Success message
```

---

## 💾 Backup Strategy

```
BACKUPS/
│
├── 20240115_100000/          ← Timestamp folder
│   ├── contacts.json         ← All contacts
│   ├── settings.json         ← SMTP + email config
│   ├── stats.json            ← Daily stats
│   └── email_logs.json       ← Send history
│
├── 20240122_100000/
│   └── ...
│
└── 20240129_100000/
    └── ...

Schedule: Weekly (./backup-firestore.sh)
Format: JSON
Retention: Manual cleanup (recommend 4 weeks)
```

---

## 🔐 Security Layers

```
┌─────────────────────────────────────────┐
│  1. FIREBASE AUTHENTICATION             │
│     - Email/Password required           │
│     - Session management                │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  2. FIRESTORE RULES                     │
│     - Read/Write: if request.auth != null│
│     - All collections protected         │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  3. CLOUD FUNCTIONS                     │
│     - Context.auth check                │
│     - Callable functions secured        │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│  4. SMTP CREDENTIALS                    │
│     - Stored in Firestore               │
│     - (Recommend: Secret Manager)       │
└─────────────────────────────────────────┘
```

---

## 📊 Technology Stack Visualization

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                        │
│  HTML5 │ Tailwind CSS │ Vanilla JavaScript │ Firebase SDK│
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                  FIREBASE SERVICES                       │
│                                                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │    Auth     │  │   Hosting   │  │  Firestore  │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │          Cloud Functions (Node.js 18)            │  │
│  │  - smartScheduler (PubSub/Cron)                  │  │
│  │  - getStats (HTTP Callable)                      │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                  EXTERNAL SERVICES                       │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │     SMTP Server (Gmail, SendGrid, etc.)         │   │
│  │              via Nodemailer                      │   │
│  └─────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Reference

### Essential Commands
```bash
./setup.sh              # Complete setup & deploy
./test-smtp.sh          # Test SMTP connection
./monitor.sh --watch    # Real-time monitoring
./backup-firestore.sh   # Backup database
./reset-contacts.sh     # Reset contacts

firebase deploy                        # Deploy everything
firebase deploy --only functions       # Functions only
firebase deploy --only hosting         # Hosting only
firebase functions:log                 # View logs
firebase emulators:start               # Local testing
```

### Essential Files
```
Start:    FINAL_SUMMARY.md  or  QUICKSTART.md
Setup:    DEPLOYMENT_CHECKLIST.md
Problems: TROUBLESHOOTING.md
Docs:     INDEX.md (navigation)
Code:     public/js/app.js, functions/src/index.ts
```

### Essential URLs
```
Firebase Console: https://console.firebase.google.com/
Your Hosting URL: https://YOUR_PROJECT_ID.web.app
GCP Console:      https://console.cloud.google.com/
```

---

## 🎉 PROJECT COMPLETE!

**Total deliverables:**
- ✅ 27 files
- ✅ 4,260+ lines of code & documentation
- ✅ Full-featured email automation system
- ✅ Production-ready
- ✅ Comprehensive documentation
- ✅ Utility scripts
- ✅ Security implemented
- ✅ Dark mode design
- ✅ Real-time updates

**Ready to:**
1. Deploy to Firebase
2. Configure SMTP
3. Add contacts
4. Start automated emailing

---

**Next step:** Open [QUICKSTART.md](QUICKSTART.md) a začni deployment! 🚀
