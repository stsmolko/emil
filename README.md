# Global Mailer - Smart Email Automation Platform

Moderná webová aplikácia na automatizované odosielanie emailov postavená na Google Firebase.

## 🚀 Technológie

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **Backend**: Firebase Cloud Functions (Node.js)
- **Databáza**: Firebase Firestore (NoSQL)
- **Autentifikácia**: Firebase Authentication
- **Hosting**: Firebase Hosting
- **Email**: Nodemailer

## 📋 Funkcie

### Dashboard
- ✅ Real-time štatistiky (odoslané, zostávajúce, chyby)
- ✅ Tabuľka kontaktov s live updates
- ✅ Manuálne pridávanie kontaktov
- ✅ Import kontaktov z CSV súboru

### Settings
- ✅ SMTP konfigurácia (Host, Port, User, Pass)
- ✅ Nastavenie predmetov emailov
- ✅ Šablóna tela emailu s premennou {{name}}

### Smart Scheduler
- ✅ Automatické odosielanie každých 30 minút
- ✅ Pracovný čas: 7:00 - 21:00
- ✅ Denný limit: 5 emailov
- ✅ Náhodný výber kontaktov
- ✅ Simulácia ľudského správania (náhodný delay)
- ✅ Rotácia predmetov emailov

## 🛠️ Inštalácia

### 1. Predpoklady

```bash
# Nainštalovať Node.js (v18 alebo vyššia)
# Nainštalovať Firebase CLI
npm install -g firebase-tools
```

### 2. Firebase Setup

1. Vytvor nový projekt na [Firebase Console](https://console.firebase.google.com/)
2. Aktivuj:
   - **Authentication** (Email/Password provider)
   - **Firestore Database** (Production mode)
   - **Functions** (Blaze plan required)
   - **Hosting**

### 3. Konfigurácia projektu

```bash
# Prihlás sa do Firebase
firebase login

# Inicializuj projekt
firebase init

# Vyber:
# - Firestore
# - Functions (TypeScript)
# - Hosting

# Alebo jednoducho skopíruj súbory z tohto projektu
```

### 4. Aktualizuj Firebase Config

Otvor `public/js/app.js` a nahraď Firebase konfiguráciu:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

Získaj tieto údaje z Firebase Console → Project Settings → General → Your apps.

### 5. Aktualizuj .firebaserc

```json
{
  "projects": {
    "default": "your-project-id"
  }
}
```

### 6. Nainštaluj dependencies

```bash
# Cloud Functions dependencies
cd functions
npm install
cd ..
```

### 7. Deploy

```bash
# Deploy všetkého
firebase deploy

# Alebo postupne:
firebase deploy --only firestore:rules
firebase deploy --only functions
firebase deploy --only hosting
```

## 👤 Prvé prihlásenie

### Vytvor prvého používateľa

Môžeš vytvoriť používateľa cez:

**Možnosť 1: Firebase Console**
1. Choď do Firebase Console → Authentication
2. Klikni "Add user"
3. Zadaj email a heslo

**Možnosť 2: Firebase CLI**

```bash
firebase auth:import users.json --hash-algo=SCRYPT
```

Príklad `users.json`:
```json
{
  "users": [
    {
      "localId": "user1",
      "email": "admin@example.com",
      "emailVerified": true,
      "passwordHash": "base64-encoded-hash",
      "salt": "base64-encoded-salt",
      "createdAt": "1704067200000"
    }
  ]
}
```

**Najjednoduchšie**: Otvor Firebase Console a manuálne pridaj používateľa.

## 📧 SMTP Konfigurácia

### Gmail Setup (odporúčané)

1. Zapni 2FA na Google účte
2. Vytvor App Password:
   - Google Account → Security → 2-Step Verification → App passwords
3. V aplikácii Global Mailer zadaj:
   - **Host**: `smtp.gmail.com`
   - **Port**: `587`
   - **User**: `vas@gmail.com`
   - **Pass**: `vygenerované app password`
   - **From**: `vas@gmail.com`

### Iné SMTP providery

- **SendGrid**: smtp.sendgrid.net (Port 587)
- **Mailgun**: smtp.mailgun.org (Port 587)
- **Amazon SES**: email-smtp.us-east-1.amazonaws.com (Port 587)

## 📊 Import kontaktov CSV

Format CSV súboru:

```csv
email,name
jan@example.com,Ján Novák
maria@example.com,Mária Kováčová
peter@example.com,Peter Molnár
```

**Dôležité**:
- Prvý riadok musí byť hlavička: `email,name`
- Každý ďalší riadok = jeden kontakt
- Bez medzier okolo čiarok (alebo s medzerami, obe fungujú)

## 🔒 Bezpečnosť

### Firestore Rules

Súbor `firestore.rules` zabezpečuje, že:
- Iba prihlásení používatelia majú prístup k dátam
- Anonymní používatelia nemajú žiadny prístup

### SMTP Credentials

**Odporúčanie**: Pre production použiť Firebase Secret Manager namiesto Firestore.

```bash
# Nastav secret
firebase functions:secrets:set SMTP_PASSWORD

# V functions/src/index.ts použi:
import { defineSecret } from "firebase-functions/params";
const smtpPassword = defineSecret("SMTP_PASSWORD");
```

## 🕒 Smart Scheduler

Cloud Function `smartScheduler` beží automaticky každých 30 minút:

### Logika:
1. Skontroluje, či je čas medzi 7:00 - 21:00
2. Skontroluje, či už bolo odoslaných 5 emailov dnes
3. Ak nie, vyberie náhodný neodoslaný kontakt
4. Čaká náhodný čas (1-3 minúty) - simulácia ľudského správania
5. Odošle email s náhodným predmetom
6. Zaznamená do databázy a logov

### Zmena frekvencie

V `functions/src/index.ts` zmeň:

```typescript
.schedule("every 30 minutes")  // Zmeň na: "every 15 minutes", "every 1 hours", atď.
```

### Zmena denného limitu

```typescript
const DAILY_LIMIT = 5;  // Zmeň na: 10, 20, atď.
```

## 📱 Používanie

1. **Prihlás sa** s Firebase Auth účtom
2. **Nastav SMTP** v Settings sekcii
3. **Pridaj kontakty**:
   - Manuálne cez formulár
   - Import z CSV súboru
4. **Monitoruj Dashboard**:
   - Real-time štatistiky
   - Tabuľka kontaktov
   - Status odoslaných emailov

## 🎨 Dizajn

- **Dark Mode**: Profesionálny tmavý režim
- **Tailwind CSS**: Moderný, responzívny dizajn
- **SaaS štýl**: Čistý, minimalistický interface
- **Real-time updates**: Live aktualizácie bez refreshu

## 🐛 Riešenie problémov

### Function sa nespúšťa

```bash
# Skontroluj logy
firebase functions:log

# Skontroluj, či je Blaze plan aktívny
firebase projects:list
```

### SMTP nefunguje

- Skontroluj, či máš správne App Password (nie bežné heslo)
- Overiť port (587 pre TLS, 465 pre SSL)
- Povoliť "Less secure app access" (len pre testing)

### Kontakty sa neukladajú

- Skontroluj Firestore rules
- Overiť autentifikáciu používateľa
- Pozrieť Console Logs v prehliadači

## 📝 Štruktúra projektu

```
global-mailer/
├── public/
│   ├── index.html          # Hlavná HTML stránka
│   └── js/
│       └── app.js          # Frontend JavaScript (Firebase SDK)
├── functions/
│   ├── src/
│   │   └── index.ts        # Cloud Functions (Scheduler, Stats)
│   ├── package.json
│   └── tsconfig.json
├── firebase.json           # Firebase konfigurácia
├── firestore.rules         # Firestore bezpečnostné pravidlá
├── firestore.indexes.json  # Firestore indexy
├── .firebaserc             # Firebase projekt ID
└── README.md
```

## 🚀 Produkčné nasazenie

### Custom doména

```bash
firebase hosting:channel:deploy production
firebase hosting:channel:deploy production --expires 30d
```

Alebo pripojiť vlastnú doménu v Firebase Console → Hosting → Add custom domain.

### Environment Variables

Pre production secrets:

```bash
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set SMTP_HOST
```

## 📈 Budúce vylepšenia

- [ ] Podpora viacerých používateľov (multi-tenancy)
- [ ] Email templates s HTML
- [ ] A/B testing predmetov
- [ ] Analytics dashboard
- [ ] Export štatistík do CSV/PDF
- [ ] Webhook integrácie
- [ ] Mobile app (React Native)

## 📄 Licencia

MIT License - voľné použitie pre osobné aj komerčné projekty.

## 🤝 Podpora

Pre otázky alebo problémy otvor issue alebo kontaktuj autora.

---

**Vytvorené s ❤️ pre efektívnu email automatizáciu**
