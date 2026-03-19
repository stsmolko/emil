# ✅ Global Mailer - Deployment Checklist

Kompletný checklist pre nasadenie aplikácie od začiatku do konca.

## 📋 Pre-deployment Checklist

### 1. Systémové požiadavky ✓
- [ ] Node.js v18 alebo vyššia nainštalovaná
  ```bash
  node -v  # Mala by byť v18+
  ```
- [ ] npm funkčné
  ```bash
  npm -v
  ```
- [ ] Firebase CLI nainštalované
  ```bash
  npm install -g firebase-tools
  firebase --version  # Mala by byť v12+
  ```
- [ ] Git nainštalované (voliteľné)
  ```bash
  git --version
  ```

---

## 🔥 Firebase Setup

### 2. Firebase Console ✓
- [ ] Google účet vytvorený
- [ ] Firebase Console otvorená: https://console.firebase.google.com/
- [ ] Nový projekt vytvorený (napr. "global-mailer-app")
- [ ] Google Analytics vypnutá (voliteľné)

### 3. Firebase Services ✓
- [ ] **Authentication** aktivovaná
  - [ ] Email/Password provider enabled
  - [ ] Test user vytvorený (admin@example.com)
  
- [ ] **Firestore Database** aktivovaná
  - [ ] Production mode vybraný
  - [ ] Region vybraná (europe-west1)
  
- [ ] **Blaze Plan** aktivovaný
  - [ ] Billing info zadaná
  - [ ] Firebase Functions enabled

### 4. Firebase Project Config ✓
- [ ] Project ID skopírované
- [ ] `.firebaserc` aktualizovaný s project ID
- [ ] Firebase Config získaný:
  - [ ] Firebase Console → Project Settings
  - [ ] Web app vytvorená
  - [ ] firebaseConfig object skopírovaný

---

## ⚙️ Lokálna konfigurácia

### 5. Projekt setup ✓
- [ ] Kód stiahnutý/skopírovaný
- [ ] Terminál otvorený v `global-mailer/` priečinku
- [ ] Firebase login:
  ```bash
  firebase login
  ```
- [ ] Firebase projekt nastavený:
  ```bash
  firebase use --add
  # Alebo: firebase use YOUR_PROJECT_ID
  ```

### 6. Dependencies ✓
- [ ] Cloud Functions dependencies:
  ```bash
  cd functions
  npm install
  cd ..
  ```
- [ ] TypeScript build test:
  ```bash
  cd functions
  npm run build
  cd ..
  ```

### 7. Configuration Files ✓
- [ ] `public/js/app.js` aktualizovaný:
  ```javascript
  const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    // ... atď
  };
  ```

---

## 🚀 Deployment

### 8. Firebase Deploy ✓
- [ ] Firestore rules deployed:
  ```bash
  firebase deploy --only firestore:rules
  ```
  Očakávaný výstup: `✔ Deploy complete!`

- [ ] Firestore indexes deployed:
  ```bash
  firebase deploy --only firestore:indexes
  ```

- [ ] Cloud Functions deployed:
  ```bash
  firebase deploy --only functions
  ```
  Očakávaný čas: 2-5 minút
  Očakávaný výstup: 
  ```
  ✔ functions[smartScheduler] deployed
  ✔ functions[getStats] deployed
  ```

- [ ] Hosting deployed:
  ```bash
  firebase deploy --only hosting
  ```
  Očakávaný výstup:
  ```
  ✔ hosting: files uploaded successfully
  Hosting URL: https://YOUR_PROJECT.web.app
  ```

### 9. Verify Deployment ✓
- [ ] Hosting URL otvorená v prehliadači
- [ ] Login screen zobrazený
- [ ] Console errors skontrolované (F12)
- [ ] Functions deployed overené:
  ```bash
  firebase functions:list
  ```
  Mali by sa zobraziť:
  - `smartScheduler`
  - `getStats`

---

## 📧 SMTP Configuration

### 10. Gmail Setup (alebo iný provider) ✓
- [ ] Google Account 2FA aktivovaná
- [ ] App Password vygenerované:
  - [ ] Google Account → Security
  - [ ] 2-Step Verification → App passwords
  - [ ] Mail + Other device
  - [ ] 16-character code skopírovaný

### 11. SMTP Test ✓
- [ ] Test SMTP connection (voliteľné):
  ```bash
  ./test-smtp.sh
  ```
- [ ] Test email prijatý

---

## 👤 Prvé prihlásenie

### 12. User Authentication ✓
- [ ] Hosting URL otvorená
- [ ] Login credentials zadané:
  - Email: admin@example.com
  - Heslo: Admin123! (alebo tvoje)
- [ ] Úspešne prihlásený
- [ ] Dashboard zobrazený

### 13. Settings Configuration ✓
- [ ] Settings tab otvorený
- [ ] SMTP konfigurácia vyplnená:
  ```
  Host: smtp.gmail.com
  Port: 587
  User: your@gmail.com
  Pass: xxxx xxxx xxxx xxxx (app password)
  From: your@gmail.com
  ```
- [ ] Email subjects zadané (voliteľné):
  ```
  Dôležitá informácia
  Ponuka len pre vás
  Špeciálna príležitosť
  ```
- [ ] Email body zadané (voliteľné):
  ```
  Ahoj {{name}},
  
  Máme pre teba skvelú ponuku...
  
  S pozdravom,
  Tvoj tím
  ```
- [ ] "Uložiť nastavenia" kliknuté
- [ ] Success message zobrazená

---

## 📊 Data Setup

### 14. Test Contacts ✓
- [ ] Dashboard tab otvorený
- [ ] Test kontakt pridaný:
  - Email: test@example.com
  - Name: Test User
- [ ] Kontakt zobrazený v tabuľke
- [ ] Status: "Čaká"

### 15. CSV Import (voliteľné) ✓
- [ ] `sample-contacts.csv` použitý alebo vlastný CSV vytvorený
- [ ] "Vybrať súbor" kliknuté
- [ ] CSV súbor vybraný
- [ ] "Importovať" kliknuté
- [ ] Success message: "Importovaných X kontaktov!"
- [ ] Kontakty zobrazené v tabuľke

---

## 🎯 Verification

### 16. Dashboard Check ✓
- [ ] Stats cards zobrazené:
  - Odoslané dnes: 0
  - Zostávajúce: X (počet kontaktov)
  - Chyby dnes: 0
  - Celkom kontaktov: X
- [ ] Contacts table zobrazená
- [ ] Real-time updates fungujú (pridaj kontakt → okamžite v tabuľke)

### 17. Cloud Function Check ✓
- [ ] Cloud Scheduler overený:
  ```bash
  # Google Cloud Console → Cloud Scheduler
  # Alebo cez CLI:
  gcloud scheduler jobs list
  ```
  Mali by sa zobraziť scheduled jobs

- [ ] Function logs skontrolované:
  ```bash
  firebase functions:log --only smartScheduler --limit 10
  ```

### 18. Test Email Send (voliteľné - počkaj ~30 min) ✓
- [ ] Počkaj na najbližší scheduled run (každých 30 min)
- [ ] ALEBO dočasne zmeň schedule na "every 1 minutes" pre test
- [ ] Logy skontrolované:
  ```bash
  firebase functions:log --only smartScheduler -f
  ```
- [ ] Email prijatý v inbox
- [ ] Dashboard štatistiky aktualizované:
  - Odoslané dnes: 1
  - Status kontaktu: "Odoslané"

---

## 🔒 Security Review

### 19. Firestore Rules ✓
- [ ] Rules deployed a active
- [ ] Test prístup bez auth (malo by byť denied)
- [ ] Test prístup s auth (malo by byť allowed)

### 20. SMTP Security ✓
- [ ] App Password použité (nie hlavné heslo)
- [ ] SMTP credentials not hardcoded v kóde
- [ ] Pre production: Zvážiť Firebase Secret Manager

---

## 📝 Documentation Review

### 21. Documentation ✓
- [ ] README.md prečítané
- [ ] QUICKSTART.md prečítané
- [ ] TROUBLESHOOTING.md preskúmané

### 22. Backup Strategy ✓
- [ ] Backup script otestovaný:
  ```bash
  ./backup-firestore.sh
  ```
- [ ] Backup súbory vytvorené v `backups/`

---

## 🎉 Post-deployment

### 23. Monitoring Setup ✓
- [ ] Monitor script otestovaný:
  ```bash
  ./monitor.sh
  ```
- [ ] Bookmark na Firebase Console → Functions
- [ ] Bookmark na Firebase Console → Firestore
- [ ] Bookmark na Hosting URL

### 24. User Training ✓
- [ ] Team members majú prístup k dokumentácii
- [ ] Demo session vykonaná (voliteľné)
- [ ] Support kontakt poskytnutý

### 25. Final Checks ✓
- [ ] Všetky features fungujú
- [ ] Žiadne console errors
- [ ] Žiadne function errors v logoch
- [ ] Dashboard updates real-time
- [ ] Email sending funguje
- [ ] Mobile responsive (test na telefóne)

---

## 🚨 Emergency Rollback Plan

### Ak niečo zlyhá:
```bash
# 1. Rollback hosting
firebase hosting:rollback

# 2. Check logs
firebase functions:log | grep ERROR

# 3. Re-deploy specific service
firebase deploy --only functions
# alebo
firebase deploy --only hosting

# 4. Worst case - full re-deploy
firebase deploy
```

---

## 📞 Support Contacts

### Internal
- [ ] Developer contact: _________________
- [ ] Admin contact: _________________

### External
- Firebase Support: https://firebase.google.com/support
- Gmail SMTP: https://support.google.com/mail/answer/7126229

---

## 🎯 Success Metrics

Po 24 hodinách:
- [ ] Minimálne 1 email automaticky odoslaný
- [ ] 0 errors v logoch
- [ ] Dashboard funguje správne
- [ ] Všetci users majú prístup

Po 1 týždni:
- [ ] X emailov úspešne odoslaných
- [ ] <5% error rate
- [ ] Backup vytvorený
- [ ] Žiadne performance issues

---

## 🔄 Maintenance Schedule

### Denné
- [ ] Check dashboard stats
- [ ] Monitor errors (./monitor.sh)

### Týždenné
- [ ] Backup databázy (./backup-firestore.sh)
- [ ] Review email logs
- [ ] Check SMTP quota

### Mesačné
- [ ] Firebase costs review
- [ ] Update dependencies
- [ ] Security audit

---

## ✅ Final Sign-off

- [ ] Deployment completed successfully
- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Team notified
- [ ] Monitoring active

**Deployed by:** _________________  
**Date:** _________________  
**Project ID:** _________________  
**Hosting URL:** _________________

---

## 🎊 Congratulations!

Tvoja Global Mailer aplikácia je live a plne funkčná!

**Next steps:**
1. Monitor prvých odoslaných emailov
2. Adjustuj SMTP/scheduler settings podľa potreby
3. Pridaj production kontakty
4. Setup regular backups

**Need help?**
- See [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Check [INDEX.md](INDEX.md) for all docs
- Run `./monitor.sh --watch` for real-time monitoring

---

**Happy Emailing! 📧🚀**
