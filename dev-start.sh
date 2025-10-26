#!/bin/bash

# Visualizations - Development Startup Script
# Runs http-server to serve all visualizations inside Docker container

echo "🎨 Starting Visualizations Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're inside Docker
if [ -f /.dockerenv ]; then
    echo -e "${GREEN}✓${NC} Running inside Docker container"
else
    echo -e "${YELLOW}⚠${NC}  Not running in Docker - this script is meant for container use"
    echo "   Run: docker-compose up -d && docker exec -it visualizations-dev bash"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}→${NC} Installing dependencies..."
    npm install
    echo -e "${GREEN}✓${NC} Dependencies installed"
else
    echo -e "${GREEN}✓${NC} Dependencies already installed"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}🚀 Starting HTTP Server...${NC}"
echo ""

# Function to check if port is in use
check_port() {
    nc -z localhost $1 2>/dev/null
    return $?
}

# Start http-server in background
echo -e "${BLUE}→${NC} Starting http-server on port 8000..."
npm run start &
SERVER_PID=$!

# Wait for server to be ready
echo "   Waiting for server to start..."
sleep 2
until check_port 8000; do
    sleep 1
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✨ Visualizations Server is running!${NC}"
echo ""
echo "Access from your host machine:"
echo "  • Main:     http://localhost:8123"
echo "  • Flocking: http://localhost:8123/flocking/index.html"
echo "  • Editor:   http://localhost:8123/flocking/koi-editor.html"
echo ""
echo "Inside container:"
echo "  • Main:     http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Trap Ctrl+C to cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping server..."
    kill $SERVER_PID 2>/dev/null
    echo "✓ Server stopped"
    exit 0
}

trap cleanup INT TERM

# Wait for server process
wait $SERVER_PID
