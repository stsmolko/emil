# 📚 Dokumentačný Index - Global Mailer

Kompletný prehľad všetkých dokumentov v projekte.

## 🎯 Pre začiatočníkov

### 1. Start tu: [QUICKSTART.md](QUICKSTART.md)
**Čo:** 10-minútový quick start guide  
**Pre koho:** Každého, kto chce aplikáciu rýchlo spustiť  
**Obsah:**
- Krok-za-krokom setup (2-3 min každý krok)
- Firebase projekt setup
- Deploy inštrukcie
- Prvý login
- SMTP konfigurácia

---

### 2. Potom prečítaj: [README.md](README.md)
**Čo:** Hlavná dokumentácia  
**Pre koho:** Všetci používatelia  
**Obsah:**
- Prehľad funkcií
- Technológie
- Inštalačné kroky
- SMTP setup
- CSV import
- Základné používanie

---

## 🔧 Pre vývojárov

### 3. Technické detaily: [DOCS.md](DOCS.md)
**Čo:** Technická dokumentácia  
**Pre koho:** Vývojári, ktorí chcú upravovať kód  
**Obsah:**
- Architektúra aplikácie
- Database schema
- Flow diagramy
- API dokumentácia
- Konfiguračné možnosti
- Monitoring & údržba
- Performance optimization

---

### 4. Prehľad projektu: [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md)
**Čo:** High-level overview  
**Pre koho:** Project managers, vývojári  
**Obsah:**
- Štruktúra projektu
- Architektúra diagram
- Data flow
- Features checklist
- Cost estimate
- Možné vylepšenia

---

## 🛠️ Utility & Skripty

### 5. Utility skripty: [SCRIPTS.md](SCRIPTS.md)
**Čo:** Dokumentácia bash skriptov  
**Pre koho:** DevOps, admin  
**Obsah:**
- `setup.sh` - Auto setup & deploy
- `test-smtp.sh` - SMTP connection test
- `backup-firestore.sh` - Database backup
- `monitor.sh` - CLI monitoring
- `reset-contacts.sh` - Reset kontaktov

---

### 6. Email templates: [EMAIL_TEMPLATES.md](EMAIL_TEMPLATES.md)
**Čo:** Guide na HTML email šablóny  
**Pre koho:** Marketéri, dizajnéri  
**Obsah:**
- HTML template examples
- Implementácia v Cloud Functions
- Responsive design
- Best practices
- Testing tips

---

## 🐛 Troubleshooting

### 7. Riešenie problémov: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
**Čo:** Kompletný troubleshooting guide  
**Pre koho:** Každý, kto má problémy  
**Obsah:**
- Firebase setup issues
- Authentication problems
- Cloud Functions errors
- SMTP connection issues
- Firestore problems
- Frontend issues
- Deployment problems
- Performance issues
- Utility commands
- Diagnostic checklist

---

## 📊 Doplnkové súbory

### Configuration files
- `firebase.json` - Firebase projekt konfigurácia
- `.firebaserc` - Firebase projekt ID
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Database indexes
- `.env.example` - Environment variables template

### Sample data
- `sample-contacts.csv` - Ukážkový CSV súbor pre import

### Package files
- `package.json` (root) - Helper scripts
- `functions/package.json` - Cloud Functions dependencies
- `functions/tsconfig.json` - TypeScript configuration

---

## 🗺️ Navigačná mapa

```
Začínam s projektom?
    ↓
├─→ QUICKSTART.md → 10-minútový setup
│
├─→ README.md → Základné info & features
│
└─→ Mám problém?
    ├─→ TROUBLESHOOTING.md → Riešenie problémov
    └─→ SCRIPTS.md → Utility skripty

Vyvíjam aplikáciu?
    ↓
├─→ DOCS.md → Technická dokumentácia
│
├─→ PROJECT_OVERVIEW.md → Architektúra
│
└─→ EMAIL_TEMPLATES.md → HTML templates
```

---

## 📖 Čítanie podľa úloh

### Úloha: "Chcem aplikáciu spustiť"
1. [QUICKSTART.md](QUICKSTART.md) - Setup za 10 minút
2. [README.md](README.md) - Základné používanie
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Ak niečo nejde

### Úloha: "Chcem upraviť funkčnosť"
1. [DOCS.md](DOCS.md) - Technické detaily
2. [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - Architektúra
3. [README.md](README.md) - Features prehľad

### Úloha: "Chcem zmeniť email design"
1. [EMAIL_TEMPLATES.md](EMAIL_TEMPLATES.md) - HTML šablóny
2. [DOCS.md](DOCS.md) - Implementácia v kóde
3. [SCRIPTS.md](SCRIPTS.md) - Test SMTP

### Úloha: "Chcem monitorovať aplikáciu"
1. [SCRIPTS.md](SCRIPTS.md) - Monitoring skripty
2. [DOCS.md](DOCS.md) - Monitoring & údržba
3. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Debug commands

### Úloha: "Mám chybu/problém"
1. [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Riešenie problémov
2. [SCRIPTS.md](SCRIPTS.md) - Diagnostic skripty
3. [DOCS.md](DOCS.md) - Technické detaily

---

## 🔍 Hľadanie konkrétnych informácií

### Firebase Setup
- QUICKSTART.md → Krok 2
- README.md → Inštalácia
- TROUBLESHOOTING.md → Firebase Setup Issues

### SMTP Configuration
- QUICKSTART.md → Krok 7
- README.md → SMTP Konfigurácia
- TROUBLESHOOTING.md → SMTP Connection Issues
- SCRIPTS.md → test-smtp.sh

### Cloud Functions
- DOCS.md → Backend Layer
- PROJECT_OVERVIEW.md → Architektúra
- TROUBLESHOOTING.md → Cloud Functions Errors

### Database Schema
- DOCS.md → Database Schema
- PROJECT_OVERVIEW.md → Database Schema
- README.md → Funkcie

### Deployment
- QUICKSTART.md → Krok 5
- README.md → Deploy
- TROUBLESHOOTING.md → Deployment Problems
- SCRIPTS.md → setup.sh

### Monitoring
- SCRIPTS.md → monitor.sh
- DOCS.md → Monitoring
- TROUBLESHOOTING.md → Debug Commands

### Performance
- DOCS.md → Performance Optimization
- TROUBLESHOOTING.md → Performance Issues
- PROJECT_OVERVIEW.md → Cost Estimate

---

## 📝 Súbory podľa typu

### 📖 Návody (Tutorials)
- QUICKSTART.md
- README.md

### 📚 Referencia (Reference)
- DOCS.md
- PROJECT_OVERVIEW.md

### 🛠️ Nástroje (Tools)
- SCRIPTS.md
- EMAIL_TEMPLATES.md

### 🐛 Podpora (Support)
- TROUBLESHOOTING.md

### ⚙️ Konfigurácia (Config)
- firebase.json
- firestore.rules
- .firebaserc
- .env.example

---

## 🎓 Učebné cesty

### Pre začiatočníkov (Beginners)
1. QUICKSTART.md (10 min)
2. README.md - úvod (15 min)
3. Test aplikácie (30 min)
4. TROUBLESHOOTING.md - podľa potreby

**Celkom: ~1 hodina**

### Pre pokročilých (Intermediate)
1. README.md - celý dokument (30 min)
2. DOCS.md - architektúra (45 min)
3. SCRIPTS.md (20 min)
4. Úpravy aplikácie (2-4 hodiny)

**Celkom: ~3-5 hodín**

### Pre expertov (Advanced)
1. PROJECT_OVERVIEW.md (30 min)
2. DOCS.md - všetko (1 hodina)
3. Kód review (functions + frontend) (2 hodiny)
4. EMAIL_TEMPLATES.md (30 min)
5. Custom development (varies)

**Celkom: ~4+ hodiny**

---

## 💡 Tipy na efektívne čítanie

### Prvý krát
1. Začni s QUICKSTART.md
2. Postupuj krok-za-krokom
3. Neskáč medzi dokumentmi
4. Otestuj každý krok pred pokračovaním

### Druhý krát
1. Prečítaj README.md celý
2. Preskúmaj DOCS.md podľa záujmu
3. Vyskúšaj utility skripty
4. Experimentuj s kódom

### Ako referenciu
1. Použi INDEX.md (tento súbor) na navigáciu
2. Ctrl+F na vyhľadávanie v dokumentoch
3. Záložky na často používané sekcie
4. TROUBLESHOOTING.md pri problémoch

---

## 📞 Kde hľadať ďalšiu pomoc

### Oficiálna dokumentácia
- [Firebase Docs](https://firebase.google.com/docs)
- [Cloud Functions Guide](https://firebase.google.com/docs/functions)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Nodemailer Docs](https://nodemailer.com/)

### Komunity
- [Stack Overflow - Firebase](https://stackoverflow.com/questions/tagged/firebase)
- [Firebase Community](https://firebase.google.com/community)
- [Reddit r/Firebase](https://reddit.com/r/firebase)

### Video tutoriály
- [Firebase YouTube](https://youtube.com/firebase)
- [Fireship.io](https://fireship.io/)

---

## 🔄 Aktualizácie dokumentácie

**Posledná aktualizácia:** 2024-01-15  
**Verzia:** 1.0.0

Pri pridávaní nových dokumentov:
1. Pridaj odkaz do tohto indexu
2. Aktualizuj navigačnú mapu
3. Pridaj do príslušnej kategórie
4. Aktualizuj "Čítanie podľa úloh"

---

## ✅ Checklist pre nových používateľov

Pred začatím sa uisti, že máš:
- [ ] Prečítaný QUICKSTART.md
- [ ] Firebase účet vytvorený
- [ ] Node.js nainštalované
- [ ] Firebase CLI nainštalované
- [ ] Gmail App Password (alebo iný SMTP)

Po spustení aplikácie:
- [ ] Úspešne prihlásený
- [ ] SMTP nakonfigurované
- [ ] Test kontakty pridané
- [ ] Email úspešne odoslaný
- [ ] Dashboard zobrazuje štatistiky

---

**Happy Learning! 📚**

Ak máš otázky alebo nejasnosti, začni v [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
