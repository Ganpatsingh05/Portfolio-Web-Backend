import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

// Import routes
import projectsRouter from './routes/projects';
import contactRouter from './routes/contact';
import analyticsRouter from './routes/analytics';
import adminRouter from './routes/admin';
import uploadsRouter from './routes/uploads';
import publicRouter from './routes/public';

// Load environment variables
dotenv.config();

const app = express();
// Trust only the first proxy hop (Render/NGINX) for correct IP/proto without being permissive
// Using numeric value avoids the express-rate-limit permissive trust proxy error
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// ================= CORS CONFIGURATION =================
// Enhanced: captures derived allowed origins for diagnostics & provides optional ALLOW_LOCALHOST override
const derivedAllowedOrigins: string[] = [];
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

if (configuredOrigins.length) {
  derivedAllowedOrigins.push(...configuredOrigins);
}
if (process.env.ALLOW_LOCALHOST === 'true') {
  derivedAllowedOrigins.push('http://localhost:3000');
}

app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // Allow curl / server-to-server
    if (!origin) return callback(null, true);

    const isAllowed = (() => {
      for (const entry of derivedAllowedOrigins) {
        if (entry === origin) return true;
        if (entry.startsWith('*.')) {
          const base = entry.slice(1); // ".example.com"
            if (origin.endsWith(base)) return true;
        }
      }
      return false;
    })();

    if (isAllowed) return callback(null, true);
    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
// ======================================================

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files: serve uploads from the compiled directory (dist/uploads)
// Fallbacks are included to cover different deploy layouts
(() => {
  const candidates = [
    path.resolve(__dirname, './uploads'),        // dist/uploads (preferred; where admin.ts writes)
    path.resolve(__dirname, '../uploads'),       // projectRoot/uploads (older path)
    path.resolve(process.cwd(), 'uploads'),      // cwd/uploads (last resort)
  ];
  for (const dir of candidates) {
    app.use('/uploads', express.static(dir));
  }
})();

// (Legacy /gdash static admin removed) -- old static dashboard fully deprecated in favor of Next.js admin.

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Health check via API prefix (useful for frontends proxying /api)
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Backend is running 🚀',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/contact', contactRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/uploads', uploadsRouter);
// Public, unauthenticated routes expected by the frontend hooks
app.use('/api', publicRouter);

// Endpoint inventory for diagnostics
app.get('/api/_endpoints', (req: Request, res: Response) => {
  const endpoints = [
    // Health
    { method: 'GET', path: '/health', public: true },
    { method: 'GET', path: '/api/health', public: true },
    // Public content
    { method: 'GET', path: '/api/personal-info', public: true },
    { method: 'GET', path: '/api/projects', public: true },
    { method: 'GET', path: '/api/skills', public: true },
    { method: 'GET', path: '/api/experiences', public: true },
    { method: 'POST', path: '/api/analytics', public: true },
    // Contact
    { method: 'POST', path: '/api/contact', public: true },
    // Analytics extended
    { method: 'POST', path: '/api/analytics/page-view', public: true },
    { method: 'POST', path: '/api/analytics/event', public: true },
    { method: 'GET', path: '/api/analytics', public: true },
    { method: 'GET', path: '/api/analytics/summary', public: true },
    { method: 'GET', path: '/api/analytics/detailed', public: true },
    // Admin auth
    { method: 'POST', path: '/api/admin/login', auth: false },
    // Admin protected collections
    { method: 'GET', path: '/api/admin/dashboard', auth: true },
    { method: 'GET', path: '/api/admin/projects', auth: true },
    { method: 'POST', path: '/api/admin/projects', auth: true },
    { method: 'PUT', path: '/api/admin/projects/:id', auth: true },
    { method: 'DELETE', path: '/api/admin/projects/:id', auth: true },
    { method: 'GET', path: '/api/admin/skills', auth: true },
    { method: 'POST', path: '/api/admin/skills', auth: true },
    { method: 'PUT', path: '/api/admin/skills/:id', auth: true },
    { method: 'DELETE', path: '/api/admin/skills/:id', auth: true },
    { method: 'GET', path: '/api/admin/experiences', auth: true },
    { method: 'POST', path: '/api/admin/experiences', auth: true },
    { method: 'PUT', path: '/api/admin/experiences/:id', auth: true },
    { method: 'DELETE', path: '/api/admin/experiences/:id', auth: true },
    { method: 'GET', path: '/api/admin/messages', auth: true },
    { method: 'PUT', path: '/api/admin/messages/:id/read', auth: true },
    { method: 'GET', path: '/api/admin/personal-info', auth: true },
    { method: 'PUT', path: '/api/admin/personal-info', auth: true },
    { method: 'GET', path: '/api/admin/settings', auth: true },
    { method: 'PUT', path: '/api/admin/settings', auth: true },
    { method: 'POST', path: '/api/admin/upload/resume', auth: true },
    // Uploads
    { method: 'POST', path: '/api/uploads/image', auth: false },
    { method: 'POST', path: '/api/uploads/resume', auth: false },
    { method: 'DELETE', path: '/api/uploads/image/:publicId', auth: false }
  ];
  res.json({
    environment: process.env.NODE_ENV,
    total: endpoints.length,
    endpoints
  });
});

// CORS diagnostics endpoint
app.get('/api/_cors', (req: Request, res: Response) => {
  res.json({
    environment: process.env.NODE_ENV,
    configured: configuredOrigins,
    derived: derivedAllowedOrigins,
    allowLocalhostFlag: process.env.ALLOW_LOCALHOST === 'true'
  });
});

// Default route
app.get('/', (req: Request, res: Response) => {
  res.json({ 
    message: 'Portfolio Backend API',
    version: '1.0.0',
    docs: '/api/docs'
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  
  if (err.status === 404) {
    return res.status(404).json({ error: 'Resource not found' });
  }
  
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }
  
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔗 API URL: http://localhost:${PORT}`);
  }
});

export default app;
