# 🛠️ Utility Scripts

Pomocné bash skripty pre správu Global Mailer aplikácie.

## 📜 Dostupné skripty

### 1. `setup.sh` - Automatická inštalácia
```bash
./setup.sh
```
Automaticky nainštaluje dependencies, prihlási do Firebase a deployne celú aplikáciu.

**Čo robí:**
- Overí Firebase CLI a Node.js
- Prihlási do Firebase (`firebase login`)
- Nainštaluje Cloud Functions dependencies
- Deployne Firestore rules
- Deployne Cloud Functions
- Deployne Hosting

---

### 2. `test-smtp.sh` - Test SMTP pripojenia
```bash
./test-smtp.sh
```
Interaktívny test SMTP konfigurácie.

**Použitie:**
1. Zadáš SMTP credentials
2. Zadáš test email adresu
3. Skript overí pripojenie
4. Pošle test email

**Výstup:**
- ✅ Connection successful + test email odoslaný
- ❌ Connection failed + error detail

---

### 3. `backup-firestore.sh` - Zálohovanie databázy
```bash
./backup-firestore.sh
```
Exportuje všetky Firestore kolekcie do JSON súborov.

**Čo exportuje:**
- `contacts.json`
- `settings.json`
- `stats.json`
- `email_logs.json`

**Uložené do:**
```
backups/YYYYMMDD_HHMMSS/
├── contacts.json
├── settings.json
├── stats.json
└── email_logs.json
```

---

### 4. `monitor.sh` - Monitoring Dashboard
```bash
# Jednorázový snapshot
./monitor.sh

# Auto-refresh každých 30 sekúnd
./monitor.sh --watch
```
CLI dashboard so štatistikami z Firebase.

**Zobrazuje:**
- Počet spustení `smartScheduler`
- Celkový počet chýb
- Posledných 5 chýb s detailom

---

### 5. `reset-contacts.sh` - Reset kontaktov
```bash
./reset-contacts.sh
```
⚠️ **POZOR:** Resetuje všetky kontakty na status "neodoslané"

**Použitie:**
- Testing schedulera
- Opätovné odoslanie kampane
- Debugging

**Čo robí:**
1. Nastaví `sent: false` pre všetky kontakty
2. Vymaže `sentAt`, `subject`, `error` polia
3. Resetuje denné štatistiky

---

## 🎯 Typické workflow

### Prvé spustenie
```bash
# 1. Setup projektu
./setup.sh

# 2. Test SMTP konfigurácie
./test-smtp.sh

# 3. Deploy
firebase deploy
```

### Pravidelná údržba
```bash
# Záloha databázy (týždenné)
./backup-firestore.sh

# Monitoring (denne)
./monitor.sh --watch
```

### Debugging
```bash
# Skontroluj logy
firebase functions:log --only smartScheduler

# Test SMTP
./test-smtp.sh

# Reset kontaktov pre re-test
./reset-contacts.sh

# Re-deploy funkcie
firebase deploy --only functions
```

### Update aplikácie
```bash
# Zmena kódu v public/js/app.js alebo functions/src/index.ts

# Build & deploy
cd functions && npm run build && cd ..
firebase deploy

# Alebo len špecifická časť
firebase deploy --only hosting
firebase deploy --only functions
```

---

## 🔧 Požiadavky

Všetky skripty vyžadujú:
- Firebase CLI nainštalované (`npm install -g firebase-tools`)
- Prihlásenie do Firebase (`firebase login`)
- Node.js nainštalované (pre backup a reset skripty)

---

## 🐛 Troubleshooting

### "Permission denied"
```bash
chmod +x *.sh
```

### "Firebase project not set"
```bash
firebase use --add
# Vyber svoj projekt
```

### "Admin SDK error" (backup/reset scripts)
```bash
# Nainštaluj firebase-admin v functions folder
cd functions
npm install firebase-admin
cd ..
```

---

## 💡 Ďalšie užitočné príkazy

```bash
# Live tail logs
firebase functions:log --only smartScheduler -f

# Clear all logs (GCP Console)
gcloud logging logs delete projects/YOUR_PROJECT_ID/logs/cloudaudit.googleapis.com%2Factivity

# List all deployed functions
firebase functions:list

# Delete specific function
firebase functions:delete smartScheduler

# View Firestore indexes
firebase firestore:indexes

# Deploy only rules
firebase deploy --only firestore:rules
```

---

**Poznámka:** Niektoré skripty (backup, reset) používajú Firebase Admin SDK a vyžadujú service account credentials pre plnohodnotnú funkčnosť. Pre jednoduchosť môžeš použiť Firebase Console manuálne.
