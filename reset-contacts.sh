#!/bin/bash

# Reset všetky kontakty na status "neodoslané"
# Užitočné pre testovanie

echo "🔄 Reset Contacts Script"
echo "========================"
echo ""

read -p "⚠️  Naozaj chceš resetovať všetky kontakty na 'neodoslané'? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Zrušené."
    exit 1
fi

echo ""
echo "Resetujem kontakty..."

# Create temporary script
cat > /tmp/reset-contacts.js << 'EOF'
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

async function resetContacts() {
    const snapshot = await db.collection('contacts').get();
    
    console.log(`Našiel som ${snapshot.size} kontaktov...`);
    
    let count = 0;
    const batch = db.batch();
    
    snapshot.forEach(doc => {
        batch.update(doc.ref, {
            sent: false,
            sentAt: admin.firestore.FieldValue.delete(),
            subject: admin.firestore.FieldValue.delete(),
            error: admin.firestore.FieldValue.delete()
        });
        count++;
    });
    
    await batch.commit();
    console.log(`✅ ${count} kontaktov bolo resetovaných`);
    
    // Reset stats
    await db.collection('stats').doc('daily').set({
        sentToday: 0,
        lastResetDate: new Date().toISOString().split('T')[0]
    });
    
    console.log('✅ Štatistiky resetované');
    process.exit(0);
}

resetContacts().catch(err => {
    console.error('❌ Chyba:', err);
    process.exit(1);
});
EOF

# Run
cd functions
node /tmp/reset-contacts.js

# Cleanup
rm /tmp/reset-contacts.js

echo ""
echo "✅ Reset dokončený!"
