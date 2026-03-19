#!/bin/bash

# Global Mailer - Quick Setup Script
# Tento skript pomôže s rýchlym nastavením projektu

echo "🚀 Global Mailer - Setup Script"
echo "================================"
echo ""

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI nie je nainštalované."
    echo "📦 Nainštaluj ho pomocou: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI nájdené"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js nie je nainštalované."
    echo "📦 Nainštaluj ho z: https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js nájdené: $NODE_VERSION"
echo ""

# Login to Firebase
echo "🔐 Prihlasovanie do Firebase..."
firebase login
echo ""

# Install functions dependencies
echo "📦 Inštalácia Cloud Functions dependencies..."
cd functions
npm install
cd ..
echo "✅ Dependencies nainštalované"
echo ""

# Deploy Firestore rules
echo "🔒 Deploy Firestore security rules..."
firebase deploy --only firestore:rules
echo ""

# Deploy functions
echo "⚡ Deploy Cloud Functions..."
firebase deploy --only functions
echo ""

# Deploy hosting
echo "🌐 Deploy web hosting..."
firebase deploy --only hosting
echo ""

echo "================================"
echo "✅ Setup dokončený!"
echo ""
echo "📝 Ďalšie kroky:"
echo "1. Otvor Firebase Console a vytvor prvého používateľa (Authentication)"
echo "2. Aktualizuj Firebase config v public/js/app.js"
echo "3. Prihlás sa do aplikácie"
echo "4. Nastav SMTP konfiguráciu v Settings"
echo "5. Pridaj kontakty alebo importuj CSV"
echo ""
echo "🌐 Tvoja aplikácia beží na:"
firebase hosting:channel:list | grep "Live Channel" || echo "Spusti: firebase hosting:channel:deploy production"
echo ""
