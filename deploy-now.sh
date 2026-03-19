#!/bin/bash

# Global Mailer - Quick Deploy Script
# Rýchly deployment helper pre Firebase

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}"
echo "╔═══════════════════════════════════════════╗"
echo "║     GLOBAL MAILER - QUICK DEPLOY         ║"
echo "║     Firebase Deployment Helper           ║"
echo "╚═══════════════════════════════════════════╝"
echo -e "${NC}"

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI nie je nainštalované!${NC}"
    echo ""
    echo "Nainštaluj Firebase CLI:"
    echo "  npm install -g firebase-tools"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Firebase CLI nainštalované${NC}"
echo ""

# Check Firebase version
FIREBASE_VERSION=$(firebase --version)
echo -e "${BLUE}📦 Firebase CLI version: ${FIREBASE_VERSION}${NC}"
echo ""

# Check if logged in
echo -e "${YELLOW}🔐 Kontrolujem Firebase prihlásenie...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${RED}❌ Nie si prihlásený do Firebase!${NC}"
    echo ""
    echo -e "${YELLOW}Prihlasovanie...${NC}"
    firebase login
    echo ""
fi

echo -e "${GREEN}✅ Prihlásený do Firebase${NC}"
echo ""

# Show current project
echo -e "${YELLOW}📊 Aktuálny Firebase projekt:${NC}"
firebase use
echo ""

# Confirm project
read -p "$(echo -e ${YELLOW}Je to správny projekt? [y/n]: ${NC})" -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${YELLOW}Vyber správny projekt:${NC}"
    firebase use --add
    echo ""
fi

# Build functions
echo -e "${YELLOW}🔨 Building Cloud Functions (TypeScript)...${NC}"
cd functions
if npm run build; then
    echo -e "${GREEN}✅ Build úspešný${NC}"
else
    echo -e "${RED}❌ Build zlyhal!${NC}"
    exit 1
fi
cd ..
echo ""

# Ask what to deploy
echo -e "${PURPLE}╔═══════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║   ČO CHCEŠ DEPLOYNÚŤ?                   ║${NC}"
echo -e "${PURPLE}╚═══════════════════════════════════════════╝${NC}"
echo ""
echo "1) Všetko (Hosting + Functions + Firestore)"
echo "2) Len Hosting (Frontend)"
echo "3) Len Functions (Backend)"
echo "4) Len Firestore (Rules + Indexes)"
echo "5) Zrušiť"
echo ""
read -p "$(echo -e ${YELLOW}Vyber možnosť [1-5]: ${NC})" choice

case $choice in
    1)
        echo ""
        echo -e "${PURPLE}🚀 Deploying VŠETKO...${NC}"
        firebase deploy
        ;;
    2)
        echo ""
        echo -e "${BLUE}🌐 Deploying Hosting...${NC}"
        firebase deploy --only hosting
        ;;
    3)
        echo ""
        echo -e "${YELLOW}⚡ Deploying Functions...${NC}"
        firebase deploy --only functions
        ;;
    4)
        echo ""
        echo -e "${GREEN}🔐 Deploying Firestore...${NC}"
        firebase deploy --only firestore
        ;;
    5)
        echo ""
        echo -e "${RED}❌ Deployment zrušený${NC}"
        exit 0
        ;;
    *)
        echo ""
        echo -e "${RED}❌ Neplatná voľba${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ DEPLOYMENT DOKONČENÝ!             ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════╝${NC}"
echo ""

# Get project info
PROJECT_ID=$(firebase use | grep -o "global-[a-z-]*")
if [ -n "$PROJECT_ID" ]; then
    HOSTING_URL="https://${PROJECT_ID}.web.app"
    CONSOLE_URL="https://console.firebase.google.com/project/${PROJECT_ID}/overview"
    
    echo -e "${PURPLE}📱 Hosting URL:${NC}"
    echo "   $HOSTING_URL"
    echo ""
    echo -e "${PURPLE}🎛️  Firebase Console:${NC}"
    echo "   $CONSOLE_URL"
    echo ""
fi

# Next steps
echo -e "${YELLOW}📋 ĎALŠIE KROKY:${NC}"
echo ""
echo "1. Otvor Hosting URL v prehliadači"
echo "2. Vytvor prvého používateľa (Firebase Console → Authentication)"
echo "3. Prihlás sa do aplikácie"
echo "4. Nastav SMTP (Settings tab)"
echo "5. Pridaj kontakty (Dashboard)"
echo ""
echo -e "${GREEN}🎉 Hotovo! Užívaj si automatizáciu!${NC}"
echo ""

# Offer to open URLs
read -p "$(echo -e ${YELLOW}Chceš otvoriť Hosting URL? [y/n]: ${NC})" -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]] && [ -n "$HOSTING_URL" ]; then
    open "$HOSTING_URL" 2>/dev/null || xdg-open "$HOSTING_URL" 2>/dev/null || echo "Otvor manuálne: $HOSTING_URL"
fi

echo ""
read -p "$(echo -e ${YELLOW}Chceš otvoriť Firebase Console? [y/n]: ${NC})" -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]] && [ -n "$CONSOLE_URL" ]; then
    open "$CONSOLE_URL" 2>/dev/null || xdg-open "$CONSOLE_URL" 2>/dev/null || echo "Otvor manuálne: $CONSOLE_URL"
fi

echo ""
echo -e "${BLUE}📖 Pre viac informácií: cat DEPLOYMENT_READY.md${NC}"
echo ""
