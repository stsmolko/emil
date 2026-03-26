# ⚠️ POTREBNÉ NASADENIE CLOUD FUNCTIONS

## Čo bolo zmenené:

### ✅ **Frontend (už nasadený)**
- Odstránené pole "Denný limit emailov" z formulára
- Zmenený text z "5/deň" na "10/deň"
- Zjednodušené nastavenia

### 🔧 **Backend (treba nasadiť manuálne)**

#### Zmeny v Cloud Functions:
1. **Pevný limit: 10 emailov/deň** (namiesto 5)
2. **Náhodný denný cieľ: 1-10 emailov**
   - Každý deň sa náhodne vyberie, koľko emailov sa odošle (1 až 10)
   - Vyzerá to prirodzenejšie pre spam filtre
   - Lepšie imituje ľudské správanie
3. **Pracovné dni: Pondelok až Sobota**
   - Nedeľa: VOĽNO (žiadne emaily)
   - Pondelok - Sobota: aktívne
4. **Pracovné hodiny: 7:00 - 21:00**
   - Emaily sa posielajú len v tomto čase
   - Interval: **každých 60 minút** (1 hodina)
   - Plus náhodné opozdenie: 1-3 minúty

#### Ako to funguje:
```
Pondelok:  Náhodný cieľ = 3 emaily → odošle 3 (7:00-21:00)
Utorok:    Náhodný cieľ = 8 emailov → odošle 8 (7:00-21:00)
Streda:    Náhodný cieľ = 5 emailov → odošle 5 (7:00-21:00)
...
Sobota:    Náhodný cieľ = 4 emaily → odošle 4 (7:00-21:00)
Nedeľa:    VOĽNO - žiadne emaily
```

---

## 🚀 Ako nasadiť Cloud Functions:

Otvor terminál a zadaj:

```bash
cd /Users/steffi/global-mailer
firebase deploy --only functions
```

Alebo nasaď všetko naraz:

```bash
firebase deploy
```

---

## ✅ Po nasadení:

- Dashboard bude zobrazovať "Limit: 10/deň"
- Systém bude denne posielať náhodný počet emailov (1-10)
- Emaily len Pondelok-Sobota, 7:00-21:00
- Nedeľa voľná
- Formulár bude jednoduchší (bez zbytočného poľa)

---

**Vytvorené:** 2026-03-21
**Aktualizované:** 2026-03-21 (pridané: Pondelok-Sobota)
**Status:** Frontend nasadený ✅ | Backend čaká na nasadenie ⏳
