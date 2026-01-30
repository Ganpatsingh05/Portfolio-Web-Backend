import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';

const router = Router();

// JWT secret handling
const JWT_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

const getJwtSecret = () => JWT_SECRET || 'dev_fallback_insecure_jwt_secret';

/**
 * Admin authentication middleware
 * Verifies JWT token and attaches admin info to request
 */
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    (req as any).adminUser = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// GET /login - Method guidance
router.get('/login', (req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method not allowed',
    message: 'Use POST /api/admin/login with JSON: {"username":"...","password":"..."}',
  });
});

// OPTIONS /login - CORS preflight
router.options('/login', (req: Request, res: Response) => {
  res.setHeader('Allow', 'POST, OPTIONS');
  res.status(204).end();
});

// POST /login - Admin authentication
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;
    
    // Get admin credentials from environment
    const adminUsername = process.env.ADMIN_USERNAME || (process.env.NODE_ENV !== 'production' ? 'admin' : '');
    const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'GanpatPortfolio2024!' : '');

    if (process.env.NODE_ENV === 'production' && (!adminUsername || !adminPassword)) {
      console.error('Admin credentials not configured');
      return res.status(500).json({ error: 'Admin credentials are not configured' });
    }

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username, role: 'admin' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { username, role: 'admin' },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
