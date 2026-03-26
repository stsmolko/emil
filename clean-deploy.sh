#!/bin/bash

echo "================================"
echo "Clean Deploy - Delete & Recreate"
echo "================================"
echo ""

cd /Users/steffi/global-mailer

# Delete old functions completely
echo "🗑️  Deleting old functions..."
firebase functions:delete mailScheduler --force 2>&1 | grep -v "Error: An unexpected error"
firebase functions:delete getDashboardStats --force 2>&1 | grep -v "Error: An unexpected error"

# Wait a bit
echo ""
echo "⏳ Waiting 10 seconds for cleanup..."
sleep 10

# Deploy fresh
echo ""
echo "🚀 Deploying fresh functions..."
firebase deploy --only functions

echo ""
echo "================================"
if [ $? -eq 0 ]; then
    echo "✅ Success!"
else
    echo "⚠️  Check errors above"
    echo ""
    echo "Try manual approach:"
    echo "1. Go to: https://console.firebase.google.com/project/global-email-script/functions"
    echo "2. Delete both functions manually"
    echo "3. Run: firebase deploy --only functions"
fi
echo "================================"
echo ""
