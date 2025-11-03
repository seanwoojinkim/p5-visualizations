#!/bin/bash
# EEG Neurofeedback Monitor - Setup Script
# Creates virtual environment and installs all dependencies

set -e  # Exit on error

echo "=========================================="
echo "EEG Neurofeedback Monitor Setup"
echo "=========================================="
echo ""

# Check Python version
echo "Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
REQUIRED_VERSION="3.9"

if ! python3 -c "import sys; exit(0 if sys.version_info >= (3,9) else 1)"; then
    echo "Error: Python 3.9 or higher required"
    echo "Current version: $PYTHON_VERSION"
    echo "Please install Python 3.9+ and try again"
    exit 1
fi

echo "✓ Python $PYTHON_VERSION detected"
echo ""

# Create virtual environment
echo "Creating virtual environment..."
if [ -d "venv" ]; then
    echo "Warning: venv directory already exists"
    read -p "Remove and recreate? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf venv
        python3 -m venv venv
        echo "✓ Virtual environment recreated"
    else
        echo "Using existing virtual environment"
    fi
else
    python3 -m venv venv
    echo "✓ Virtual environment created"
fi
echo ""

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate
echo "✓ Virtual environment activated"
echo ""

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
echo "✓ pip upgraded"
echo ""

# Install requirements
echo "Installing Python dependencies..."
echo "This may take a few minutes..."
pip install -r requirements.txt

if [ $? -eq 0 ]; then
    echo "✓ All dependencies installed successfully"
else
    echo "Error: Failed to install dependencies"
    exit 1
fi
echo ""

# Create necessary directories
echo "Creating directories..."
mkdir -p logs
mkdir -p sessions
echo "✓ Directories created"
echo ""

# Test muselsl installation
echo "Testing muselsl installation..."
if python3 -c "import muselsl" 2>/dev/null; then
    echo "✓ muselsl installed correctly"
else
    echo "Warning: muselsl import failed"
    echo "You may need to install libusb: sudo apt-get install libusb-1.0-0"
fi
echo ""

# Test pylsl installation
echo "Testing pylsl installation..."
if python3 -c "import pylsl" 2>/dev/null; then
    echo "✓ pylsl installed correctly"
else
    echo "Warning: pylsl import failed"
fi
echo ""

# Check Bluetooth
echo "Checking Bluetooth availability..."
if command -v bluetoothctl &> /dev/null; then
    BLUETOOTH_STATUS=$(bluetoothctl show 2>/dev/null | grep "Powered:" | awk '{print $2}')
    if [ "$BLUETOOTH_STATUS" = "yes" ]; then
        echo "✓ Bluetooth is available and powered on"
    else
        echo "Warning: Bluetooth may not be powered on"
        echo "Run: sudo bluetoothctl power on"
    fi
else
    echo "Warning: bluetoothctl not found - cannot check Bluetooth status"
fi
echo ""

# Display next steps
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Ensure Muse 2 headset is charged and powered on"
echo ""
echo "2. Start muselsl stream (in a separate terminal):"
echo "   source venv/bin/activate"
echo "   muselsl stream"
echo ""
echo "3. Test Muse connection:"
echo "   source venv/bin/activate"
echo "   python tests/test_muse_connection.py"
echo ""
echo "4. Read the setup guide:"
echo "   cat docs/MUSE_SETUP.md"
echo ""
echo "=========================================="
echo ""

# Offer to run connection test
read -p "Run Muse connection test now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting connection test..."
    echo "Make sure muselsl stream is running in another terminal!"
    echo ""
    sleep 2
    python tests/test_muse_connection.py
fi
