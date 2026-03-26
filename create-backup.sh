#!/bin/bash

echo "================================"
echo "Komplexná záloha Global Mailer"
echo "================================"
echo ""

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_BASE="/Users/steffi/Backups"
BACKUP_DIR="$BACKUP_BASE/global-mailer-$TIMESTAMP"

# Create backup directory
mkdir -p "$BACKUP_DIR"

echo "📁 Vytváram zálohu do: $BACKUP_DIR"
echo ""

# Copy project files
echo "📋 Kopírujem projekt..."
cd /Users/steffi
cp -r global-mailer "$BACKUP_DIR/" 2>/dev/null

# Remove unnecessary files from backup
echo "🧹 Čistím nepotrebné súbory..."
rm -rf "$BACKUP_DIR/global-mailer/node_modules"
rm -rf "$BACKUP_DIR/global-mailer/functions/node_modules"
rm -rf "$BACKUP_DIR/global-mailer/functions/lib"
rm -rf "$BACKUP_DIR/global-mailer/.git"

# Create info file
echo "📝 Vytváram info súbor..."
cat > "$BACKUP_DIR/BACKUP_INFO.txt" <<EOF
Global Mailer - Záloha
=====================

Dátum: $(date)
Projekt: global-email-script
GitHub: https://github.com/stsmolko/emil.git
Firebase: https://console.firebase.google.com/project/global-email-script
Live URL: https://global-email-script.web.app

Záloha obsahuje:
- Všetok zdrojový kód
- Firebase Functions
- Hosting súbory (public/)
- Konfiguráciu (firebase.json, firestore.rules, atď.)
- Dokumentáciu (*.md súbory)
- Utility skripty

Neobsahuje:
- node_modules (reštartuj cez: npm install)
- .git (použiť GitHub)
- Firestore databázu (použiť Firebase Console export)
- Používateľov (použiť Firebase Auth export)

Obnoviť:
1. Rozbaľ zálohu
2. cd global-mailer
3. cd functions && npm install && cd ..
4. firebase login
5. firebase use global-email-script
6. firebase deploy

EOF

# Create archive
echo "📦 Vytváram archív..."
cd "$BACKUP_BASE"
tar -czf "global-mailer-$TIMESTAMP.tar.gz" "global-mailer-$TIMESTAMP/" 2>/dev/null

if [ -f "global-mailer-$TIMESTAMP.tar.gz" ]; then
    echo "✅ Archív vytvorený: global-mailer-$TIMESTAMP.tar.gz"
    ARCHIVE_SIZE=$(du -h "global-mailer-$TIMESTAMP.tar.gz" | cut -f1)
    echo "   Veľkosť: $ARCHIVE_SIZE"
else
    echo "⚠️ Archív sa nepodarilo vytvoriť, ale priečinok je dostupný"
fi

echo ""
echo "================================"
echo "✅ Záloha dokončená!"
echo "================================"
echo ""
echo "Umiestnenie:"
echo "  Priečinok: $BACKUP_DIR"
if [ -f "global-mailer-$TIMESTAMP.tar.gz" ]; then
    echo "  Archív: $BACKUP_BASE/global-mailer-$TIMESTAMP.tar.gz"
fi
echo ""
echo "Obsah:"
ls -lh "$BACKUP_DIR" | head -20
echo ""
