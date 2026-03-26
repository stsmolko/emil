#!/bin/bash

echo "================================"
echo "Fixing and Deploying Functions"
echo "================================"
echo ""

# Fix npm cache permissions
echo "🔧 Fixing npm cache permissions..."
sudo chown -R $(whoami) ~/.npm

# Update Firebase packages
echo ""
echo "📦 Updating Firebase packages..."
cd /Users/steffi/global-mailer/functions
npm install --save firebase-functions@latest firebase-admin@latest

# Build
echo ""
echo "🔨 Building functions..."
npm run build

# Deploy only functions
echo ""
echo "🚀 Deploying functions to Firebase..."
cd ..
firebase deploy --only functions

echo ""
echo "================================"
echo "✅ Deploy complete!"
echo "================================"
echo ""
echo "Your app is live at:"
echo "https://global-email-script.web.app"
echo ""
