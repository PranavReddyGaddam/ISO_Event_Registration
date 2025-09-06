# ISO Web App - Volunteer Management System

A comprehensive volunteer management system with registration, check-in, and admin dashboard features.

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git

### 1. Clone the Repository
   ```bash
git clone https://github.com/YOUR_USERNAME/ISO_WEB_APP.git
cd ISO_WEB_APP
```

### 2. Environment Setup
Create a `.env` file in the root directory with the following variables:

   ```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Gmail Configuration
GMAIL_EMAIL=your_gmail_address@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password

# Application Configuration
ENVIRONMENT=production
SECRET_KEY=your_very_secure_jwt_secret_key_here
DEFAULT_VOLUNTEER_PASSWORD=your_secure_default_password

# Event Configuration
EVENT_NAME=Your Event Name
EVENT_DATE=2024-01-01
```

### 3. Run with Docker Compose
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🛠️ Manual Setup (Alternative)

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 📋 Features

### 🔐 Authentication
- President and Volunteer role-based access
- JWT token authentication
- Password change functionality

### 👥 Volunteer Management
- Volunteer application system
- Approval/rejection workflow
- Email notifications
- Default password assignment

### 📝 Registration System
- Dynamic ticket pricing
- QR code generation
- PDF ticket delivery
- Payment mode tracking (Cash/Zelle)

### ✅ Check-in System
- QR code scanning
- Real-time check-in tracking
- Mobile-responsive interface

### 📊 Admin Dashboard
- Real-time statistics
- Attendee management
- Volunteer oversight
- Pricing management
- Application review

## 🏗️ Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with Python 3.11
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT with bcrypt password hashing
- **Email**: Gmail API integration
- **File Generation**: PDF and QR code generation

### Frontend (React + TypeScript)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **State Management**: React Context API
- **Routing**: React Router
- **QR Scanning**: html5-qrcode library

## 🔧 Configuration

### Environment Variables
All configuration is done through environment variables. See the `.env` example above.

### Database Schema
The application uses Supabase with the following main tables:
- `users` - User accounts (presidents and volunteers)
- `attendees` - Event attendees
- `volunteer_applications` - Volunteer signup applications
- `ticket_pricing` - Dynamic pricing configuration
- `events` - Event information

## 📱 Mobile Support
- Responsive design for all screen sizes
- Mobile-optimized QR code scanning
- Touch-friendly interface

## 🔒 Security Features
- Row Level Security (RLS) in Supabase
- JWT token authentication
- Password hashing with bcrypt
- CORS protection
- Environment variable protection

## 🚀 Deployment

### Docker Deployment
The application is containerized and ready for deployment:

```bash
# Production deployment
docker-compose -f docker-compose.yml up -d

# With reverse proxy
docker-compose --profile reverse-proxy up -d
```

### Health Checks
Both frontend and backend include health checks for monitoring.

## 📞 Support
For issues or questions, please create an issue in the GitHub repository.

## 📄 License
This project is licensed under the MIT License.