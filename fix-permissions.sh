#!/bin/bash

echo "================================"
echo "Fixing Service Account Permissions"
echo "================================"
echo ""

PROJECT_ID="global-email-script"
SERVICE_ACCOUNT="868325182303-compute@developer.gserviceaccount.com"

echo "📝 Setting up permissions for Cloud Build..."
echo ""
echo "Service Account: $SERVICE_ACCOUNT"
echo "Project: $PROJECT_ID"
echo ""

# Check if gcloud is available
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Installing..."
    echo ""
    echo "Please visit: https://cloud.google.com/sdk/docs/install"
    echo ""
    echo "Or use Manual method (see below)"
    exit 1
fi

# Authenticate if needed
echo "🔐 Checking authentication..."
gcloud auth list

echo ""
echo "🔧 Adding required roles to service account..."
echo ""

# Add Logs Writer role
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/logging.logWriter"

# Add Cloud Build Service Account role (may also be needed)
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/cloudbuild.builds.builder"

echo ""
echo "✅ Permissions added!"
echo ""
echo "Now try deployment again:"
echo "  cd /Users/steffi/global-mailer"
echo "  firebase deploy --only functions"
echo ""
