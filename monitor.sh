#!/bin/bash

# Monitoring Dashboard - CLI version
# Zobrazuje real-time štatistiky z Firebase

echo "📊 Global Mailer - Monitoring Dashboard"
echo "========================================"
echo ""

PROJECT_ID=$(firebase use | grep "active project" | awk '{print $4}')

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Firebase projekt nie je nastavený"
    exit 1
fi

echo "📦 Project: $PROJECT_ID"
echo ""

# Function to fetch stats
fetch_stats() {
    # Get logs from last hour
    echo "📈 Statistics (last 24 hours)"
    echo "----------------------------"
    
    # Function execution count
    echo "⚡ Function Executions:"
    firebase functions:log --limit 100 | grep "smartScheduler" | wc -l | xargs echo "  - smartScheduler runs:"
    
    # Errors
    echo ""
    echo "❌ Errors:"
    firebase functions:log --limit 100 | grep -i "error" | wc -l | xargs echo "  - Total errors:"
    
    # Recent errors
    echo ""
    echo "🔍 Recent Errors (last 5):"
    firebase functions:log --limit 100 | grep -i "error" | head -5 | sed 's/^/  /'
    
    echo ""
    echo "----------------------------"
}

# Watch mode
if [ "$1" == "--watch" ]; then
    while true; do
        clear
        echo "📊 Global Mailer - Monitoring Dashboard (Auto-refresh)"
        echo "========================================"
        echo ""
        fetch_stats
        echo ""
        echo "Press Ctrl+C to exit"
        echo "Refreshing in 30 seconds..."
        sleep 30
    done
else
    fetch_stats
    echo ""
    echo "💡 Tip: Use './monitor.sh --watch' for auto-refresh"
fi
