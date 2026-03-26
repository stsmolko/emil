#!/bin/bash

echo "================================"
echo "Firebase Backup - Complete"
echo "================================"
echo ""

PROJECT_ID="global-email-script"
BACKUP_DIR="/Users/steffi/Backups/global-mailer-$(date +%Y%m%d-%H%M%S)"

mkdir -p "$BACKUP_DIR"

echo "📦 Backup priečinok: $BACKUP_DIR"
echo ""

# Export Firestore (requires gcloud)
if command -v gcloud &> /dev/null; then
    echo "☁️ Exportujem Firestore databázu..."
    gcloud firestore export gs://${PROJECT_ID}-backups/firestore-$(date +%Y%m%d-%H%M%S) \
        --project=$PROJECT_ID
    echo "✅ Firestore export spustený (beží v cloude)"
else
    echo "⚠️ gcloud nie je nainštalovaný - preskakujem Firestore export"
    echo "   Nainštalujte: https://cloud.google.com/sdk/docs/install"
fi

echo ""
echo "📥 Sťahujem zoznam používateľov..."
firebase auth:export "$BACKUP_DIR/users.json" --project $PROJECT_ID 2>/dev/null || echo "⚠️ Auth export zlyhal (možno žiadni používatelia)"

echo ""
echo "📄 Sťahujem Firestore rules..."
cp firestore.rules "$BACKUP_DIR/"

echo ""
echo "📋 Sťahujem Functions..."
cp -r functions "$BACKUP_DIR/"

echo ""
echo "🌐 Sťahujem Hosting..."
cp -r public "$BACKUP_DIR/"

echo ""
echo "⚙️ Sťahujem konfiguráciu..."
cp firebase.json "$BACKUP_DIR/"
cp .firebaserc "$BACKUP_DIR/"
cp firestore.indexes.json "$BACKUP_DIR/"

echo ""
echo "📚 Sťahujem dokumentáciu..."
cp *.md "$BACKUP_DIR/" 2>/dev/null

echo ""
echo "================================"
echo "✅ Backup dokončený!"
echo "================================"
echo ""
echo "Umiestnenie: $BACKUP_DIR"
echo ""
ls -lh "$BACKUP_DIR"
echo ""
