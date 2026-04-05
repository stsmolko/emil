#!/bin/bash

echo "================================"
echo "🔄 Presun zálohy na Desktop"
echo "================================"
echo ""

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SOURCE="/Users/steffi/global-mailer"
DESKTOP="/Users/steffi/Desktop"
BACKUP_NAME="GlobalMailer-Backup-$TIMESTAMP"

echo "📦 Vytváram záložný priečinok..."
mkdir -p "$DESKTOP/$BACKUP_NAME"

echo "📋 Kopírujem projekt..."
cp -r "$SOURCE" "$DESKTOP/$BACKUP_NAME/"

echo "🧹 Čistím nepotrebné súbory..."
rm -rf "$DESKTOP/$BACKUP_NAME/global-mailer/node_modules"
rm -rf "$DESKTOP/$BACKUP_NAME/global-mailer/functions/node_modules"
rm -rf "$DESKTOP/$BACKUP_NAME/global-mailer/functions/lib"
rm -rf "$DESKTOP/$BACKUP_NAME/global-mailer/.git"
rm -rf "$DESKTOP/$BACKUP_NAME/global-mailer/backups"

echo "📝 Vytváram info súbor..."
cat > "$DESKTOP/$BACKUP_NAME/README.txt" <<EOF
=============================================
GLOBAL MAILER - ZÁLOHA
=============================================

Dátum zálohy: $(date)
Verzia: $(cd "$SOURCE" && git log -1 --format="%h - %s" 2>/dev/null || echo "N/A")

GITHUB REPO:
  https://github.com/stsmolko/emil.git

FIREBASE:
  Project: global-email-script
  Console: https://console.firebase.google.com/project/global-email-script
  Live URL: https://global-email-script.web.app

OBSAH ZÁLOHY:
  ✓ Celý zdrojový kód
  ✓ Firebase Functions
  ✓ Hosting súbory (public/)
  ✓ Konfiguráciu (firebase.json, firestore.rules)
  ✓ Dokumentáciu (*.md súbory)
  ✓ Utility skripty

NEOBSAHUJE:
  ✗ node_modules (znova nainštalovať: npm install)
  ✗ .git folder (použiť GitHub repo)
  ✗ Firestore databázu (exportovať z Firebase Console)
  ✗ Firebase Auth používateľov (exportovať z Firebase Console)

OBNOVENIE ZO ZÁLOHY:
  1. Rozbaľ priečinok global-mailer
  2. cd global-mailer
  3. cd functions && npm install && cd ..
  4. firebase login
  5. firebase use global-email-script
  6. firebase deploy

DÔLEŽITÉ LINKY:
  - Firebase Console: https://console.firebase.google.com/project/global-email-script
  - GitHub Repo: https://github.com/stsmolko/emil
  - Live App: https://global-email-script.web.app

=============================================
EOF

echo "📦 Vytváram ZIP archív..."
cd "$DESKTOP"
zip -r "$BACKUP_NAME.zip" "$BACKUP_NAME" > /dev/null 2>&1

if [ -f "$BACKUP_NAME.zip" ]; then
    SIZE=$(du -h "$BACKUP_NAME.zip" | cut -f1)
    echo ""
    echo "================================"
    echo "✅ ZÁLOHA ÚSPEŠNE VYTVORENÁ!"
    echo "================================"
    echo ""
    echo "📁 Priečinok: $DESKTOP/$BACKUP_NAME"
    echo "📦 ZIP archív: $DESKTOP/$BACKUP_NAME.zip ($SIZE)"
    echo ""
    echo "💡 Tip: Archív môžete skopírovať na externý disk alebo cloud"
    echo ""
else
    echo ""
    echo "================================"
    echo "✅ ZÁLOHA VYTVORENÁ (bez ZIP)"
    echo "================================"
    echo ""
    echo "📁 Umiestnenie: $DESKTOP/$BACKUP_NAME"
    echo ""
fi

# Show contents
echo "Obsah zálohy:"
ls -lh "$DESKTOP/$BACKUP_NAME/" | head -20

echo ""
echo "Hotovo! 🎉"
echo ""
