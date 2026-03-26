#!/bin/bash

echo "================================"
echo "Final Deployment Fix"
echo "================================"
echo ""

# Fix npm permissions
echo "🔧 Fixing npm cache..."
sudo chown -R $(whoami) ~/.npm

# Go to functions
cd /Users/steffi/global-mailer/functions

# Clean install
echo ""
echo "🧹 Cleaning node_modules..."
rm -rf node_modules package-lock.json

# Install correct versions
echo ""
echo "📦 Installing correct Firebase versions..."
npm install firebase-functions@^4.9.0 firebase-admin@^11.11.0 nodemailer@^6.9.7 @types/nodemailer@^6.4.14 typescript@^5.3.3

# Build
echo ""
echo "🔨 Building..."
npm run build

# Deploy
echo ""
echo "🚀 Deploying to Firebase..."
cd ..
firebase deploy --only functions

echo ""
echo "================================"
echo "✅ Deployment Complete!"
echo "================================"
echo ""
echo "🌐 Your app: https://global-email-script.web.app"
echo "📊 Firebase Console: https://console.firebase.google.com/project/global-email-script"
echo ""
