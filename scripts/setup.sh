#!/bin/bash

# Volunteer Event Check-in Setup Script

set -e

echo "🚀 Setting up Volunteer Event Check-in System..."

# Check if Python 3.8+ is installed
if ! python3 --version | grep -E "Python 3\.(8|9|10|11|12)" > /dev/null; then
    echo "❌ Python 3.8+ is required but not found."
    exit 1
fi

# Check if Node.js 16+ is installed
if ! node --version | grep -E "v(1[6-9]|[2-9][0-9])" > /dev/null; then
    echo "❌ Node.js 16+ is required but not found."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Setup backend
echo "📦 Setting up backend..."
cd backend

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment template
if [ ! -f ".env" ]; then
    echo "Creating backend .env file..."
    cp env.example .env
    echo "⚠️  Please update backend/.env with your actual credentials!"
fi

cd ..

# Setup frontend
echo "📦 Setting up frontend..."
cd frontend

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Copy environment template if needed
if [ ! -f ".env" ]; then
    echo "Creating frontend .env file..."
    echo "VITE_API_BASE_URL=http://localhost:8000" > .env
fi

cd ..

# Create main environment file
if [ ! -f ".env" ]; then
    echo "Creating main .env file..."
    cp env.example .env
    echo "⚠️  Please update .env with your actual credentials!"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update your .env files with actual credentials:"
echo "   - Supabase project URL and keys"
echo "   - ConvertKit API keys"
echo "   - Set a secure SECRET_KEY"
echo ""
echo "2. Set up your Supabase database:"
echo "   - Copy and run the SQL from database-schema.sql"
echo "   - Create a 'qr-codes' storage bucket"
echo ""
echo "3. Start the development servers:"
echo "   - Backend: ./scripts/start-backend.sh"
echo "   - Frontend: ./scripts/start-frontend.sh"
echo "   - Or both: ./scripts/start-dev.sh"
echo ""
echo "📚 Read README.md for detailed instructions"
