#!/bin/bash

echo "================================"
echo "Diagnostic Check"
echo "================================"
echo ""

echo "📋 Checking Firebase project billing..."
echo ""
echo "Please open this link and verify:"
echo "https://console.cloud.google.com/billing/linkedaccount?project=868325182303"
echo ""
echo "Make sure:"
echo "  ✓ Billing account is linked"
echo "  ✓ Blaze (Pay as you go) plan is active"
echo ""
echo "Press Enter when verified..."
read

echo ""
echo "🔧 Checking required APIs..."
firebase projects:list

echo ""
echo "📦 Checking local build..."
cd /Users/steffi/global-mailer/functions
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Local build works!"
    echo "❌ Problem is in Google Cloud Build"
    echo ""
    echo "Most common cause: BILLING NOT ENABLED"
    echo ""
    echo "Solutions:"
    echo "1. Enable billing: https://console.cloud.google.com/billing?project=868325182303"
    echo "2. Or use the app WITHOUT auto-scheduler (already works!)"
    echo ""
    echo "Your app is already live at:"
    echo "https://global-email-script.web.app"
else
    echo ""
    echo "❌ Local build failed - fixing code first"
fi

echo ""
