#!/bin/bash
# Simple HTTP server for local development
# ES6 modules require HTTP/HTTPS protocol (won't work with file://)

echo "Starting local HTTP server..."
echo "Simulation: http://localhost:8000/index.html"
echo "Editor: http://localhost:8000/koi-editor.html"
echo ""
echo "Press Ctrl+C to stop the server"

python3 -m http.server 8000
