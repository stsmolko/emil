# 🚀 Global Mailer - Smart Email Automation Platform

> Moderná webová aplikácia na automatizované odosielanie emailov postavená na Google Firebase.

[![Firebase](https://img.shields.io/badge/Firebase-v10-orange?style=flat-square&logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## ⚡ Quick Start

```bash
# 1. Clone & Setup
cd global-mailer

# 2. Čítaj dokumentáciu
cat START_HERE.md

# 3. Automatický setup
./setup.sh

# Hotovo! 🎉
```

**Čas potrebný:** 10 minút  
**Náklady:** $0.00 - $0.50/mesiac  
**Výsledok:** Funkčná email automation

---

## 📖 Dokumentácia

| Súbor | Účel | Kedy použiť |
|-------|------|-------------|
| **[START_HERE.md](START_HERE.md)** | ⭐ Kompletný prehľad | Začni tu! |
| **[QUICKSTART.md](QUICKSTART.md)** | 🚀 10-min setup | Chcem rýchly štart |
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | ✅ 25-krokový checklist | Deployment |
| **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** | 🐛 Riešenie problémov | Niečo nefunguje |
| **[DOCS.md](DOCS.md)** | 🔧 Technická doc | Vývoj & customizácia |
| **[INDEX.md](INDEX.md)** | 🗺️ Navigácia | Hľadám dokumenty |

📚 **[Všetkých 12 dokumentov](INDEX.md)** - 6,400+ riadkov dokumentácie

---

## ✨ Features

### ✅ Implementované
- 🔐 Firebase Authentication (Email/Password)
- 📊 Real-time Dashboard s live štatistikami
- 📋 Contact Management (add, import CSV, delete)
- ⚙️ SMTP Configuration (web UI)
- 🤖 Smart Scheduler (Cloud Function)
  - Každých 30 minút
  - Working hours (7-21h)
  - Daily limit (5 emails/deň)
  - Náhodné delays (human-like)
  - Subject rotation
- 🎨 Dark Mode Design (Tailwind CSS)
- 📱 Fully Responsive
- 🔄 Real-time Updates
- 🛠️ 5 Utility Scripts

---

## 🏗️ Tech Stack

```
Frontend:  HTML5 + Tailwind CSS + Vanilla JS
Backend:   Firebase Cloud Functions (Node.js 18)
Database:  Firebase Firestore (NoSQL)
Auth:      Firebase Authentication
Hosting:   Firebase Hosting
Email:     Nodemailer (SMTP)
```

---

## 📊 Projekt v číslach

```
📁 27 súborov
📝 6,406 riadkov kódu
📚 12 dokumentov (2,800+ riadkov)
🛠️ 5 utility skriptov
💰 $0.00 - $0.50/mesiac
⚡ Production-ready
```

---

## 🚀 Deployment

### Automatický (odporúčané)
```bash
./setup.sh
```

### Manuálny
```bash
firebase login
firebase use --add
cd functions && npm install && cd ..
firebase deploy
```

**Čas:** 5-10 minút  
**Výsledok:** Live aplikácia na Firebase Hosting

---

## 🛠️ Utility Commands

```bash
./setup.sh              # Complete setup & deploy
./test-smtp.sh          # Test SMTP connection
./monitor.sh --watch    # Real-time monitoring
./backup-firestore.sh   # Backup database
./reset-contacts.sh     # Reset contacts

firebase deploy                    # Deploy all
firebase functions:log             # View logs
firebase emulators:start           # Local dev
```

---

## 📂 Štruktúra projektu

```
global-mailer/
├── 📚 Dokumentácia (12 súborov)
├── 🔧 Konfigurácia (Firebase, Firestore)
├── 🌐 Frontend (public/)
│   ├── index.html (Dark mode SPA)
│   └── js/app.js (Firebase logic)
├── ⚡ Backend (functions/)
│   └── src/index.ts (Cloud Functions)
├── 🛠️ Utility Scripts (5 bash)
└── 📊 Sample Data (CSV)
```

Detailne: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)

---

## 💡 Ako začať

### Pre začiatočníkov
1. Čítaj **[START_HERE.md](START_HERE.md)**
2. Postupuj podľa **[QUICKSTART.md](QUICKSTART.md)**
3. Ak problém → **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

### Pre vývojárov
1. Prečítaj **[DOCS.md](DOCS.md)**
2. Preskúmaj **[PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)**
3. Customizuj podľa potrieb

---

## 🐛 Problém?

**Najprv skontroluj:** [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

Obsahuje riešenia pre:
- Firebase setup issues
- Authentication problems
- Cloud Functions errors
- SMTP connection issues
- Deployment problems
- A oveľa viac...

---

## 💰 Náklady

### Free Tier (5 emails/deň)
```
Firebase:  $0.00
SMTP:      $0.00 (Gmail)
━━━━━━━━━━━━━━━━━━━━
TOTAL:     $0.00/mesiac ✅
```

### Scaling (50 emails/deň)
```
Firebase:  $0.00 - $1.00
SMTP:      $5 - $10 (SendGrid)
━━━━━━━━━━━━━━━━━━━━
TOTAL:     $5 - $15/mesiac
```

---

## 🔒 Bezpečnosť

- ✅ Firebase Authentication
- ✅ Firestore Security Rules
- ✅ SMTP App Passwords
- ✅ Input validation

Pre production: [DOCS.md - Security](DOCS.md#security)

---

## 📞 Podpora

### Dokumentácia
- **Quick Start:** QUICKSTART.md
- **Technická:** DOCS.md
- **Troubleshooting:** TROUBLESHOOTING.md
- **Navigácia:** INDEX.md

### External
- [Firebase Docs](https://firebase.google.com/docs)
- [Nodemailer](https://nodemailer.com/)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/firebase)

---

## 🎯 Ďalšie kroky

Po deployment:
1. ⚙️ Nastav SMTP v Settings
2. 📁 Importuj kontakty (CSV alebo manuálne)
3. 📊 Sleduj Dashboard
4. 📧 Užívaj si automatizáciu!

---

## 📝 License

MIT License - voľné použitie pre osobné aj komerčné projekty.

---

## 🎉 Status

```
✅ Production Ready
✅ Fully Documented
✅ Security Implemented
✅ Real-time Updates
✅ Dark Mode Design
✅ Utility Tools
✅ Sample Data
```

---

## 🌟 Made with

Firebase • TypeScript • Tailwind CSS • Nodemailer • Love ❤️

---

**🚀 Ready to start? → [START_HERE.md](START_HERE.md)**
