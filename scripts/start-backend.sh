#!/bin/bash

# Start the FastAPI backend server

set -e

echo "🔥 Starting FastAPI backend server..."

# Check if we're in the right directory
if [ ! -f "backend/app/main.py" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "❌ Virtual environment not found. Please run ./scripts/setup.sh first"
    exit 1
fi

# Activate virtual environment
source venv/bin/activate

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please copy env.example to .env and configure it"
    exit 1
fi

# Start the server
echo "🚀 Server starting at http://localhost:8000"
echo "📖 API docs available at http://localhost:8000/api/docs"
echo "🔍 Health check at http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
