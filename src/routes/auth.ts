import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { supabase } from '../lib/supabase';

const router = Router();

/**
 * Admin authentication middleware
 * Verifies Supabase JWT token and attaches admin info to request
 */
export const authenticateAdmin = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Attach user info to request
    (req as any).adminUser = {
      id: user.id,
      email: user.email,
      role: 'admin'
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// GET /login - Method guidance
router.get('/login', (req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method not allowed',
    message: 'Use POST /api/admin/login with JSON: {"email":"...","password":"..."}',
  });
});

// OPTIONS /login - CORS preflight
router.options('/login', (req: Request, res: Response) => {
  res.setHeader('Allow', 'POST, OPTIONS');
  res.status(204).end();
});

// POST /login - Admin authentication with Supabase
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    
    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Return the Supabase session token
    res.json({
      token: data.session.access_token,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: 'admin'
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
