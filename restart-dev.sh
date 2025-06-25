#!/bin/bash

echo "🔄 Restarting Fresh development server..."

# Kill any existing Fresh/Deno development servers
echo "🛑 Killing existing servers..."
pkill -f "deno.*dev.ts" 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true

# Wait a moment for processes to fully terminate
sleep 1

# Check if port 8000 is free
if lsof -i:8000 >/dev/null 2>&1; then
    echo "❌ Port 8000 is still in use. Trying to force kill..."
    lsof -ti:8000 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

# Start the Fresh development server
echo "🚀 Starting Fresh server on http://localhost:8000..."
deno task start 