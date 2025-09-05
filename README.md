# Volunteer Event Check-in Web App

A comprehensive QR code-based event check-in system built with FastAPI, TypeScript, Tailwind CSS, Supabase, and ConvertKit integration.

## Features

- **Registration System**: Type-safe attendee registration with form validation
- **QR Code Generation**: Automatic QR code generation and storage
- **Email Integration**: Automated email delivery via ConvertKit API
- **Check-in System**: QR scanner and manual check-in options
- **Real-time Dashboard**: Live statistics and attendee management
- **TypeScript**: Fully typed frontend ready for React migration
- **Responsive Design**: Mobile-first design with Tailwind CSS

## Tech Stack

### Backend
- **FastAPI**: Modern Python web framework with async support
- **Supabase**: PostgreSQL database with real-time features
- **Python QRCode**: QR code generation library
- **ConvertKit API**: Email marketing integration
- **Pydantic**: Data validation and serialization

### Frontend
- **Vite**: Fast build tool and development server
- **TypeScript**: Strict typing for better development experience
- **Tailwind CSS**: Utility-first CSS framework
- **html5-qrcode**: Camera-based QR code scanning

### Database
- **Supabase PostgreSQL**: Cloud-hosted PostgreSQL database
- **Row Level Security**: Built-in security policies
- **Real-time subscriptions**: Live data updates
- **File Storage**: QR code image hosting

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── models.py            # Pydantic models
│   │   ├── config.py            # Configuration settings
│   │   ├── routers/
│   │   │   └── attendees.py     # API endpoints
│   │   └── utils/
│   │       ├── supabase_client.py    # Supabase integration
│   │       ├── qr_generator.py       # QR code generation
│   │       └── kit_email_sender.py   # ConvertKit integration
│   ├── requirements.txt         # Python dependencies
│   └── env.example             # Environment variables template
├── frontend/
│   ├── src/
│   │   ├── types/              # TypeScript type definitions
│   │   ├── utils/              # Utility functions
│   │   ├── pages/              # Page implementations
│   │   ├── styles/             # CSS styles
│   │   └── main.ts             # Application entry point
│   ├── package.json            # Node.js dependencies
│   ├── tsconfig.json           # TypeScript configuration
│   ├── tailwind.config.js      # Tailwind CSS configuration
│   └── index.html              # HTML entry point
├── database-schema.sql         # Supabase database schema
└── README.md                   # This file
```

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- Supabase account
- ConvertKit account (for email integration)

### 1. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Copy the database schema from `database-schema.sql`
3. Run the SQL commands in your Supabase SQL editor
4. Create a storage bucket named `qr-codes` in the Storage section

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Copy environment variables:
   ```bash
   cp env.example .env
   ```

5. Update `.env` with your credentials:
   ```env
   SUPABASE_URL=your_supabase_project_url
   SUPABASE_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_role_key
   CONVERTKIT_API_KEY=your_convertkit_api_key
   CONVERTKIT_SECRET_KEY=your_convertkit_secret_key
   SECRET_KEY=your_secret_key_for_jwt
   ```

6. Start the development server:
   ```bash
   python -m uvicorn app.main:app --reload
   ```

The API will be available at `http://localhost:8000`

### 3. Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## API Endpoints

### Registration
- `POST /api/register` - Register new attendee and generate QR code

### Check-in
- `GET /api/attendee/{qr_id}` - Get attendee by QR code ID
- `POST /api/checkin/{qr_id}` - Check in attendee

### Management
- `GET /api/attendees` - List all attendees with filters
- `GET /api/stats` - Get event statistics

### Utility
- `GET /` - API information
- `GET /health` - Health check

## Environment Variables

### Backend (.env)

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# ConvertKit Configuration
CONVERTKIT_API_KEY=your_convertkit_api_key
CONVERTKIT_SECRET_KEY=your_convertkit_secret_key

# Application Configuration
ENVIRONMENT=development
SECRET_KEY=your_secret_key_for_jwt
CORS_ORIGINS=http://localhost:5173

# Event Configuration
EVENT_NAME=Volunteer Event 2024
EVENT_DATE=2024-01-01
```

### Frontend (Optional)

Create `.env` in the frontend directory:

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Database Schema

The application uses the following main tables:

### events
- `id` (UUID, Primary Key)
- `name` (VARCHAR, Event name)
- `description` (TEXT, Event description)
- `event_date` (TIMESTAMPTZ, Event date and time)
- `location` (VARCHAR, Event location)
- `max_attendees` (INTEGER, Maximum attendees)

### attendees
- `id` (UUID, Primary Key)
- `event_id` (UUID, Foreign Key to events)
- `name` (VARCHAR, Attendee name)
- `email` (VARCHAR, Attendee email)
- `phone` (VARCHAR, Attendee phone)
- `qr_code_id` (UUID, Unique QR code identifier)
- `qr_code_url` (TEXT, URL to QR code image)
- `is_checked_in` (BOOLEAN, Check-in status)
- `checked_in_at` (TIMESTAMPTZ, Check-in timestamp)

## Features in Detail

### QR Code Generation
- Unique UUID-based QR codes for each attendee
- Automatic upload to Supabase Storage
- Styled QR codes with rounded corners
- Public URLs for email embedding

### Email Integration
- ConvertKit API integration for reliable email delivery
- Automated registration confirmation emails
- QR code attachment in emails
- Check-in confirmation emails
- HTML email templates with responsive design

### TypeScript Architecture
- Strict TypeScript configuration
- Comprehensive type definitions
- Type-safe API client
- Form validation with typed schemas
- Ready for React/shadcn migration

### Real-time Features
- Live dashboard updates via Supabase subscriptions
- Real-time check-in notifications
- Auto-refreshing statistics
- Live attendee list updates

## Development

### Backend Development

1. **Adding New Endpoints**:
   - Add route functions in `app/routers/attendees.py`
   - Define Pydantic models in `app/models.py`
   - Update API documentation

2. **Database Changes**:
   - Update `database-schema.sql`
   - Run new migrations in Supabase
   - Update Supabase client methods

3. **Email Templates**:
   - Modify templates in `app/utils/kit_email_sender.py`
   - Test with ConvertKit sandbox

### Frontend Development

1. **Adding New Pages**:
   - Create new page class in `src/pages/`
   - Add route to `src/main.ts`
   - Update navigation

2. **Type Definitions**:
   - Add types to `src/types/`
   - Update API client interfaces
   - Maintain strict typing

3. **Styling**:
   - Use Tailwind utility classes
   - Follow component patterns in `src/styles/main.css`
   - Maintain responsive design

## Deployment

### Backend Deployment (Railway/Heroku/DigitalOcean)

1. Set environment variables in your hosting platform
2. Install dependencies: `pip install -r requirements.txt`
3. Start with: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Frontend Deployment (Vercel/Netlify)

1. Build the project: `npm run build`
2. Deploy the `dist` folder
3. Configure redirects for SPA routing

### Database (Supabase)

- Supabase automatically scales
- Monitor usage in Supabase dashboard
- Set up backups and monitoring

## Security Considerations

- Row Level Security (RLS) enabled on all tables
- CORS configured for production domains
- Input validation with Pydantic models
- Rate limiting recommended for production
- HTTPS required for production deployment

## Performance Optimization

- Database indexes on frequently queried columns
- Image optimization for QR codes
- CDN recommended for static assets
- Connection pooling for database
- Caching for frequently accessed data

## Future Enhancements

### Planned Features
- React migration with shadcn/ui components
- Multi-event support
- Advanced analytics and reporting
- Mobile app with React Native
- Badge printing integration
- Bulk import/export functionality

### Migration to React
The TypeScript implementation is designed for easy React migration:

1. **Component Structure**: Page classes can be converted to React components
2. **Type Safety**: All types are React-compatible
3. **State Management**: State patterns translate to React hooks
4. **API Integration**: API client works seamlessly with React

## Troubleshooting

### Common Issues

1. **CORS Errors**:
   - Check `CORS_ORIGINS` in backend `.env`
   - Ensure frontend URL is included

2. **Database Connection**:
   - Verify Supabase credentials
   - Check RLS policies
   - Ensure database schema is applied

3. **Email Issues**:
   - Verify ConvertKit API keys
   - Check ConvertKit account limits
   - Test with ConvertKit sandbox

4. **QR Scanner Not Working**:
   - Ensure HTTPS in production
   - Check camera permissions
   - Test with different browsers

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review Supabase and ConvertKit documentation
3. Check browser console for errors
4. Verify environment variable configuration

## License

This project is open source and available under the [MIT License](LICENSE).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

**Built with ❤️ for the volunteer community**
