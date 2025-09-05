#!/bin/bash

# Start the Vite frontend development server

set -e

echo "🎨 Starting Vite frontend development server..."

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ Node modules not found. Please run ./scripts/setup.sh first"
    exit 1
fi

# Start the development server
echo "🚀 Frontend starting at http://localhost:5173"
echo "🔄 Hot reload enabled"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm run dev
