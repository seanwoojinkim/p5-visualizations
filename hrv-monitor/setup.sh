#!/bin/bash

# Polar H10 HRV Monitor Setup Script for macOS
# This script sets up the Python environment on your Mac host

set -e  # Exit on error

echo "🔧 Setting up Polar H10 HRV Monitor..."
echo ""

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found!"
    echo "Please run this script from /workspace/hrv-monitor directory"
    exit 1
fi

# Check Python version
echo "📍 Checking Python installation..."
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: python3 not found!"
    echo "Please install Python 3.8+ from https://www.python.org/downloads/"
    exit 1
fi

PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
echo "✅ Found Python $PYTHON_VERSION"
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi
echo ""

# Activate virtual environment and install dependencies
echo "📥 Installing dependencies..."
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip --quiet

# Install requirements
pip install -r requirements.txt

echo ""
echo "✅ Setup complete!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Prepare your Polar H10:"
echo "   • Moisten the electrodes on the chest strap"
echo "   • Wear the strap snugly below your chest"
echo "   • LED should flash red (pairing mode)"
echo ""
echo "2. Activate the virtual environment:"
echo "   source venv/bin/activate"
echo ""
echo "3. Start the service:"
echo "   python src/main.py"
echo ""
echo "4. Or use the run script:"
echo "   ./run.sh"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips:"
echo "   • The Polar H10 won't appear in System Settings → Bluetooth"
echo "   • This is normal for BLE devices - the app will find it"
echo "   • Make sure the H10 is WORN (needs skin contact to power on)"
echo "   • Disconnect from iPhone if currently connected"
echo ""
echo "📖 For troubleshooting, see:"
echo "   • QUICKSTART.md"
echo "   • docs/MAC_SETUP.md"
echo ""
