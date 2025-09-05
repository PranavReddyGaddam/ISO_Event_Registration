#!/bin/bash

# Start both backend and frontend development servers

set -e

echo "🚀 Starting full development environment..."

# Check if we're in the right directory
if [ ! -f "backend/app/main.py" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    jobs -p | xargs -r kill
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

echo "Starting backend server..."
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

echo "Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "🎉 Development environment is running!"
echo ""
echo "📍 Services:"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo "   API Docs: http://localhost:8000/api/docs"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for background processes
wait
