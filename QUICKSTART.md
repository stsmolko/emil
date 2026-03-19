# ⚡ Quick Start Guide - Global Mailer

Rýchly sprievodca od nuly k funkčnej aplikácii za 10 minút.

## 📋 Predpoklady

- [ ] Google/Gmail účet
- [ ] Node.js v18+ nainštalované
- [ ] Základná znalosť terminálu

## 🚀 Krok za krokom

### 1️⃣ Príprava (2 min)

```bash
# Nainštaluj Firebase CLI
npm install -g firebase-tools

# Overiť inštaláciu
firebase --version
```

### 2️⃣ Firebase Projekt (3 min)

1. **Vytvor projekt:**
   - Choď na https://console.firebase.google.com/
   - Klikni "Add project"
   - Zadaj názov: `global-mailer-app`
   - Vypni Google Analytics (voliteľné)
   - Klikni "Create project"

2. **Aktivuj služby:**

**Authentication:**
- Firebase Console → Build → Authentication
- Klikni "Get started"
- Sign-in method → Email/Password → Enable → Save

**Firestore:**
- Firebase Console → Build → Firestore Database
- Klikni "Create database"
- Vyber "Start in production mode"
- Vyber server location (europe-west1 pre Európu)
- Klikni "Enable"

**Functions (Upgrade na Blaze):**
- Firebase Console → Upgrade
- Vyber "Blaze plan" (Pay as you go)
- Zadaj billing info
- ⚠️ Nemusíš sa báť: Free tier je veľkorysý (120K funkčných invokácií/mesiac)

### 3️⃣ Setup projektu (2 min)

```bash
# Choď do priečinka projektu
cd global-mailer

# Prihlás sa do Firebase
firebase login

# Aktualizuj .firebaserc s tvojím project ID
# Otvor .firebaserc a zmeň "your-project-id" na skutočné ID
nano .firebaserc
# Alebo použiť:
firebase use --add
# Vyber svoj projekt z listu

# Nainštaluj dependencies
cd functions
npm install
cd ..
```

### 4️⃣ Firebase Config (1 min)

1. Firebase Console → Project Settings (ikona ozubeného kolesa)
2. Scrolluj dole na "Your apps"
3. Klikni "</>" (Web app)
4. Zadaj nickname: "Global Mailer Web"
5. Neklikaj "Also set up Firebase Hosting" (to už máme)
6. Klikni "Register app"
7. Skopíruj `firebaseConfig` objekt

**Aktualizuj `public/js/app.js`:**

```bash
# Otvor súbor
nano public/js/app.js

# Nájdi (riadok ~18) a nahraď:
const firebaseConfig = {
    apiKey: "TVOJ_API_KEY",
    authDomain: "tvoj-projekt.firebaseapp.com",
    projectId: "tvoj-projekt-id",
    storageBucket: "tvoj-projekt.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef123456"
};
```

### 5️⃣ Deploy (2 min)

```bash
# Deploy všetko naraz
firebase deploy

# Počkaj ~1-2 minúty...
# Na konci uvidíš:
# ✔ Deploy complete!
# Hosting URL: https://tvoj-projekt.web.app
```

### 6️⃣ Prvý používateľ

**Možnosť A - Firebase Console (jednoduchšie):**
1. Firebase Console → Authentication → Users
2. Klikni "Add user"
3. Zadaj:
   - Email: `admin@example.com`
   - Password: `Admin123!`
4. Klikni "Add user"

**Možnosť B - CLI:**
```bash
# Vytvor súbor user.json
echo '{
  "email": "admin@example.com",
  "password": "Admin123!",
  "emailVerified": true
}' > user.json

# Import (musíš mať Firebase Auth REST API enabled)
firebase auth:import user.json
```

### 7️⃣ Spustenie aplikácie

1. **Otvor Hosting URL** (z kroku 5)
   - Alebo nájdi: Firebase Console → Hosting → Dashboard
   
2. **Prihlás sa:**
   - Email: `admin@example.com`
   - Heslo: `Admin123!`

3. **Nastav SMTP** (Settings tab):
   - Host: `smtp.gmail.com`
   - Port: `587`
   - User: `tvojmail@gmail.com`
   - Pass: `tvoje_app_password` (pozri nižšie)
   - From: `tvojmail@gmail.com`

4. **Gmail App Password:**
   ```
   1. Google Account → Security
   2. 2-Step Verification → Zapni (ak nie je)
   3. App passwords → Vygeneruj
   4. Vyber "Mail" a "Other device"
   5. Názov: "Global Mailer"
   6. Skopíruj 16-znakový kód
   7. Vlož do "Pass" v aplikácii
   ```

5. **Pridaj test kontakt:**
   - Email: `test@example.com`
   - Meno: `Test Používateľ`
   - Klikni "Pridať kontakt"

6. **Alebo importuj CSV:**
   - Použiť `sample-contacts.csv`
   - Klikni "Vybrať súbor" → Vyber CSV
   - Klikni "Importovať"

### ✅ Hotovo!

Aplikácia je live a Smart Scheduler automaticky začne odosielať emaily:
- Každých 30 minút
- Medzi 7:00 - 21:00
- Max 5 emailov/deň

## 🎯 Čo ďalej?

### Testovanie Smart Schedulera

Scheduler beží automaticky, ale ak chceš testovať hneď:

```typescript
// functions/src/index.ts
// Zmeň schedule na častejšie spúšťanie:
.schedule("every 1 minutes")  // Testovanie: každú minútu

// A odstráň working hours check:
// if (!isWorkingHours()) {
//   console.log("Outside working hours");
//   return null;  // <-- Zakomentuj tieto riadky
// }

// Re-deploy:
cd functions && npm run build && cd ..
firebase deploy --only functions
```

### Monitorovanie

**Logy:**
```bash
# Real-time logy
firebase functions:log --only smartScheduler

# Filter errors
firebase functions:log --only smartScheduler | grep ERROR
```

**Dashboard:**
- Sleduj "Odoslané dnes" - malo by sa zvyšovať
- Skontroluj "Chyby dnes" - malo by byť 0
- Tabuľka kontaktov - status sa zmení na "Odoslané"

### Nastavenie vlastnej domény

```bash
# Firebase Hosting custom domain
firebase hosting:channel:deploy production

# Alebo cez Console:
# Firebase Console → Hosting → Add custom domain
```

## 🐛 Časté problémy

### "Error: Not authorized"
→ Skontroluj, či si prihlásený: `firebase login`

### "Functions require Blaze plan"
→ Upgrade na Blaze plan v Firebase Console

### "SMTP Authentication failed"
→ Použiť App Password, nie bežné Gmail heslo

### "No contacts found"
→ Pridaj aspoň jeden kontakt cez Dashboard

### Scheduler nefunguje
```bash
# Skontroluj logy
firebase functions:log

# Overiť, či je function deployed
firebase functions:list | grep smartScheduler
```

## 📊 Limits & Costs

### Firebase Free Tier (Blaze plan):
- **Firestore:** 50K reads, 20K writes, 20K deletes/deň
- **Functions:** 2M invokácií, 400K GB-seconds/mesiac
- **Hosting:** 10 GB storage, 360 MB/deň bandwidth

### Estimate pre Global Mailer:
- **5 emailov/deň × 30 dní = 150 emailov/mesiac**
- **Scheduler runs:** 48x/deň (každých 30 min) = 1,440/mesiac
- **Firestore operations:** ~10K/mesiac
- **Estimated cost:** $0.00 - $0.50/mesiac ✅

## 🎉 Gratulujem!

Tvoja aplikácia je live a posielanie emailov je automatizované.

**Užitočné príkazy:**
```bash
# Aktualizovať kód
firebase deploy

# Len functions
firebase deploy --only functions

# Len hosting
firebase deploy --only hosting

# Logy
firebase functions:log

# Local testing
firebase emulators:start

# Help
firebase --help
```

**Potrebuješ pomoc?**
- Detailné info: [README.md](README.md)
- Technická dokumentácia: [DOCS.md](DOCS.md)
- Firebase Docs: https://firebase.google.com/docs

---

**Happy emailing! 📧**
