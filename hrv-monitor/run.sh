#!/bin/bash

# Polar H10 HRV Monitor Run Script
# Activates virtual environment and starts the service

set -e

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found!"
    echo ""
    echo "Please run setup first:"
    echo "  ./setup.sh"
    echo ""
    exit 1
fi

# Check if Polar H10 preparation reminder is needed
if [ ! -f ".polar_reminder_shown" ]; then
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Polar H10 Preparation Checklist:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "Before starting, make sure:"
    echo "  ✓ Electrodes are moistened"
    echo "  ✓ Strap is worn snugly below chest"
    echo "  ✓ LED is flashing red (device active)"
    echo "  ✓ Not connected to iPhone/other devices"
    echo ""
    echo "Remember: The H10 won't appear in macOS Bluetooth Settings."
    echo "This is normal! The app will find it automatically."
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""

    # Create reminder file so we don't show this every time
    touch .polar_reminder_shown

    # Wait a moment for user to read
    sleep 2
fi

# Activate virtual environment
source venv/bin/activate

# Start the service
echo "🚀 Starting Polar H10 HRV Monitor Service..."
echo ""
python src/main.py

# Note: This will run until Ctrl+C is pressed
