# Portfolio Backend API

This is the backend API for Ganpat Singh's portfolio website built with Node.js, Express, and Supabase.

## Features

- RESTful API endpoints
- Contact form handling with disposable email validation
- Analytics tracking
- Project management with custom ordering
- Personal information management
- File upload support
- Email notifications
- **Supabase Authentication** for admin access
- Rate limiting and security

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Email**: Nodemailer
- **File Storage**: Cloudinary
- **Security**: Helmet, CORS, Rate Limiting

## API Endpoints

### Public Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get specific project
- `POST /api/contact` - Submit contact form
- `POST /api/analytics/page-view` - Track page view
- `POST /api/analytics/event` - Track custom event
- `GET /api/personal-info` - Get personal information
- `GET /api/personal-info/skills` - Get skills
- `GET /api/personal-info/experiences` - Get experiences

### Admin Endpoints (Require Authentication)

- `POST /api/admin/login` - Admin login (email/password)
- `GET /api/admin/dashboard` - Dashboard stats
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/contact` - Get all contact messages
- `PATCH /api/contact/:id/status` - Update message status
- `GET /api/analytics/summary` - Analytics summary
- `GET /api/analytics/detailed` - Detailed analytics
- `PUT /api/personal-info` - Update personal info
- `PUT /api/personal-info/skills` - Update skills
- `POST /api/personal-info/experiences` - Add experience
- `PUT /api/personal-info/experiences/:id` - Update experience
- `POST /api/uploads/image` - Upload image
- `DELETE /api/uploads/image/:publicId` - Delete image

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn package manager
- Supabase account
- Cloudinary account (for image uploads)
- SMTP email account (for contact notifications)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.production.example .env
```

3. Configure environment variables in `.env`:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Server Configuration
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=your_email@gmail.com
EMAIL_TO=your_email@gmail.com

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Authentication Setup

This app uses **Supabase Authentication**. To set up admin access:

1. Go to your Supabase Dashboard → **Authentication** → **Users**
2. Click **"Add user"**
3. Enter your email and password
4. Click **"Create user"**
5. Use this email/password to login at `/admin/login`

**No additional environment variables needed for authentication!**

### Development

Run the development server:
```bash
npm run dev
```

The API will be available at [http://localhost:5000](http://localhost:5000).

### Building for Production

Build the application:
```bash
npm run build
```

Start the production server:
```bash
npm start
```

## Project Structure

```
src/
├── lib/               # Configurations and utilities
│   ├── email.ts      # Email configuration
│   └── supabase.ts   # Supabase client configuration
├── middleware/       # Express middleware
│   └── errorHandler.ts # Error handling middleware
├── routes/           # API route handlers
│   ├── analytics.ts  # Analytics tracking
│   ├── auth.ts       # Admin authentication (Supabase Auth)
│   ├── contact.ts    # Contact form handling
│   ├── public.ts     # Public endpoints
│   ├── uploads.ts    # File upload handling
│   └── admin/        # Admin-only routes
│       ├── dashboard.ts
│       ├── experiences.ts
│       ├── hero.ts
│       ├── messages.ts
│       ├── personal.ts
│       ├── projects.ts
│       ├── settings.ts
│       └── skills.ts
└── server.ts         # Main server application

dist/                 # Compiled JavaScript (after build)
```

## Security Features

- **Supabase Authentication**: Secure email/password authentication with JWT tokens
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend domain
- **Helmet**: Security headers
- **Input Validation**: Request validation with express-validator
- **Disposable Email Blocking**: Contact form blocks disposable email domains
- **File Upload Limits**: 5MB file size limit
- **Environment Variables**: All sensitive data in environment variables

## Email Configuration

The contact form sends email notifications using Nodemailer. Supported email providers:

- Gmail (recommended)
- Outlook
- Yahoo
- Custom SMTP servers

For Gmail, you'll need to:
1. Enable 2-factor authentication
2. Generate an app-specific password
3. Use the app password in `SMTP_PASS`

## File Upload Configuration

Images are uploaded to Cloudinary with automatic optimization:

- **Size Limit**: 5MB
- **Formats**: JPG, PNG, GIF, WebP
- **Optimization**: Auto format and quality
- **Transformations**: Resized to max 1200x800px

## Deployment

### Render (Recommended)

1. Connect your GitHub repository to Render
2. Configure environment variables in Render dashboard
3. Deploy automatically on push to main branch

### Vercel/Heroku

1. Create a new app
2. Connect your GitHub repository
3. Configure environment variables
4. Enable automatic deploys

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm test` - Run tests

## API Authentication

Admin endpoints require a Bearer token obtained from `/api/admin/login`:

```javascript
// Login
const response = await fetch('/api/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@example.com',
    password: 'your_password'
  })
});

const { token } = await response.json();

// Use token for authenticated requests
const projects = await fetch('/api/admin/projects', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

## License

This project is licensed under the MIT License.
