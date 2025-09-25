# Portfolio Backend API

This is the backend API for Ganpat Singh's portfolio website built with Node.js, Express, and Supabase.

## Features

- RESTful API endpoints
- Contact form handling
- Analytics tracking
- Project management
- Personal information management
- File upload support
- Email notifications
- Admin authentication
- Rate limiting and security

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
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

- `POST /api/admin/login` - Admin login
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
cp .env.example .env
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
EMAIL_TO=ganpatsingh@example.com

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Security
JWT_SECRET=your_super_secret_jwt_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_admin_password
```

### Database Setup

1. Create a new Supabase project
2. Run the database schema:
```bash
npm run migrate
```

Or manually execute the SQL in `database/schema.sql` in your Supabase SQL editor.

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
│   └── supabase.ts   # Supabase client configuration
├── routes/           # API route handlers
│   ├── admin.ts      # Admin authentication and dashboard
│   ├── analytics.ts  # Analytics tracking
│   ├── contact.ts    # Contact form handling
│   ├── personal-info.ts # Personal information management
│   ├── projects.ts   # Project management
│   └── uploads.ts    # File upload handling
└── server.ts         # Main server application

database/
└── schema.sql        # Database schema and sample data

dist/                 # Compiled JavaScript (after build)
```

## Database Schema

The application uses 8 main tables:

1. **personal_info** - Personal information and bio
2. **projects** - Portfolio projects
3. **skills** - Technical skills
4. **experiences** - Work experiences
5. **contact_messages** - Contact form submissions
6. **analytics** - Website analytics data
7. **blog_posts** - Blog articles (future feature)
8. **testimonials** - Client testimonials (future feature)

## Security Features

- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS**: Configured for frontend domain
- **Helmet**: Security headers
- **Input Validation**: Request validation with express-validator
- **Admin Authentication**: Simple username/password authentication
- **File Upload Limits**: 5MB file size limit
- **Environment Variables**: Sensitive data in environment variables

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

### Railway

1. Connect your GitHub repository to Railway
2. Configure environment variables in Railway dashboard
3. Deploy automatically on push to main branch

### Heroku

1. Create a new Heroku app
2. Connect your GitHub repository
3. Configure environment variables in Heroku dashboard
4. Enable automatic deploys

### VPS/Cloud Server

1. Build the application: `npm run build`
2. Upload files to your server
3. Install dependencies: `npm ci --production`
4. Configure environment variables
5. Start with PM2: `pm2 start dist/server.js`

## Monitoring and Logging

The application includes:

- **Health Check**: `/health` endpoint for monitoring
- **Error Handling**: Centralized error handling middleware
- **Request Logging**: Basic request logging
- **Analytics**: Built-in analytics tracking

## Environment Variables

All required environment variables are documented in `.env.example`. Make sure to:

1. Copy `.env.example` to `.env`
2. Fill in all required values
3. Keep `.env` out of version control
4. Use different values for production

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm test` - Run tests (when implemented)

## API Authentication

### Admin Authentication

Send credentials in request headers:
```javascript
headers: {
  'username': 'admin',
  'password': 'your_admin_password'
}
```

### Frontend Integration

Configure your frontend to use the API:
```javascript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Example API call
const response = await fetch(`${API_URL}/api/projects`);
const projects = await response.json();
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit your changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
