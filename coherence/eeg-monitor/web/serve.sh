#!/bin/bash
#
# Serve the EEG Monitor Web Interface
#
# This script starts a simple HTTP server to serve the web interface.
# The interface will be available at http://localhost:8000
#

set -e

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "========================================"
echo "EEG Neurofeedback Monitor - Web Server"
echo "========================================"
echo ""
echo "Starting HTTP server on port 8000..."
echo "Interface will be available at:"
echo ""
echo "  http://localhost:8000          - Main Interface"
echo "  http://localhost:8000/test.html - Test Console"
echo ""
echo "Make sure the backend server is running:"
echo "  Terminal 1: muselsl stream"
echo "  Terminal 2: python src/main.py --protocol alpha_enhancement"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"
echo ""

# Start Python HTTP server
cd "$SCRIPT_DIR"
python3 -m http.server 8000
