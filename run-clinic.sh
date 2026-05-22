#!/bin/bash
echo "==================================================="
echo "  Pediatric Clinic Standalone Launcher (Lightweight Mode)"
echo "==================================================="
echo

echo "Installing dependencies (if needed)..."
npm install --no-audit --no-fund
echo

echo "Building the application..."
npm run build
echo

echo "Starting Clinic Database & Backend Server..."
echo "The application is ready! Your browser will open shortly..."
echo

# Start server in background
node dist/server.cjs &
SERVER_PID=$!

# Wait 2 seconds for server to start
sleep 2

# Open default browser depending on the OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  xdg-open http://localhost:3000
else
  echo "Please open http://localhost:3000 in your browser manually."
fi

echo
echo "Server is running fine (Process ID: $SERVER_PID)."
echo "-> Keep this terminal open while using the application."
echo "-> To close the app, close this terminal or press Ctrl+C."
echo

# Wait for background process to keep script open
wait $SERVER_PID
