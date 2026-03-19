#!/bin/bash

# Backup Firestore Data Script
# Exportuje všetky Firestore kolekcie do JSON súborov

echo "💾 Firestore Backup Script"
echo "=========================="
echo ""

# Check if project is set
PROJECT_ID=$(firebase use | grep "active project" | awk '{print $4}')

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Firebase projekt nie je nastavený"
    echo "Spusti: firebase use --add"
    exit 1
fi

echo "📦 Project: $PROJECT_ID"
echo ""

# Create backup directory
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

echo "📁 Backup directory: $BACKUP_DIR"
echo ""

# Collections to backup
COLLECTIONS=("contacts" "settings" "stats" "email_logs")

for collection in "${COLLECTIONS[@]}"; do
    echo "⏳ Backing up: $collection"
    
    # Export collection using firestore export
    # Note: Toto vyžaduje firestore emulator alebo admin SDK
    # Pre production použiť: gcloud firestore export
    
    # Alternative: Use Firebase Admin SDK script
    node -e "
    const admin = require('firebase-admin');
    const fs = require('fs');
    
    // Initialize with default credentials
    admin.initializeApp();
    const db = admin.firestore();
    
    db.collection('$collection').get()
        .then(snapshot => {
            const data = [];
            snapshot.forEach(doc => {
                data.push({
                    id: doc.id,
                    data: doc.data()
                });
            });
            
            fs.writeFileSync('$BACKUP_DIR/$collection.json', JSON.stringify(data, null, 2));
            console.log('✅ $collection backed up ('+data.length+' documents)');
        })
        .catch(err => {
            console.error('❌ Error backing up $collection:', err);
        });
    " 2>/dev/null || echo "⚠️  Skipped $collection (requires admin SDK setup)"
done

echo ""
echo "✅ Backup completed!"
echo "📂 Files saved to: $BACKUP_DIR"
echo ""
echo "To restore, use Firebase Console or Admin SDK"
