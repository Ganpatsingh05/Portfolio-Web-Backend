import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import supabase from '../lib/supabase';
import fs from 'fs';
import path from 'path';

const router = Router();

// Env: JWT secret handling
const JWT_SECRET = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}

// Helper: compute public base URL
const getBaseUrl = (req: Request): string => {
  const envUrl = process.env.PUBLIC_BASE_URL;
  console.log(envUrl);
  if (envUrl) return envUrl.replace(/\/$/, '');
  const proto = (req.get('x-forwarded-proto') || req.protocol || 'http').toString();
  const host = (req.get('x-forwarded-host') || req.get('host')) as string | undefined;
  if (host) return `${proto}://${host}`;
  return `http://localhost:${process.env.PORT || 5000}`;
};

// Helper to verify Cloudinary config isn't using placeholder values
const isValidCloudinaryConfig = () => {
  const cn = (process.env.CLOUDINARY_CLOUD_NAME || '').toLowerCase();
  const key = (process.env.CLOUDINARY_API_KEY || '').toLowerCase();
  const sec = (process.env.CLOUDINARY_API_SECRET || '').toLowerCase();
  const placeholders = ['your_api_key', 'your_api_secret', 'your_cloud_name'];
  const hasValues = Boolean(cn && key && sec);
  const hasPlaceholders = placeholders.some(p => cn.includes(p) || key.includes(p) || sec.includes(p));
  return hasValues && !hasPlaceholders;
};

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for resume uploads (PDF files)
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for resumes
  },
  fileFilter: (req: Request, file: any, cb: any) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for resume!'));
    }
  },
});

// Admin authentication middleware
const authenticateAdmin = (req: Request, res: Response, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
  const secret = JWT_SECRET || 'dev_fallback_insecure_jwt_secret';
  const decoded = jwt.verify(token, secret);
    (req as any).adminUser = decoded; // Store admin info separately, not in req.body
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Admin login
// Helpful GET (browser visit) returns guidance instead of 404
router.get('/login', (req: Request, res: Response) => {
  res.status(405).json({
    error: 'Method not allowed',
    message: 'Use POST /api/admin/login with JSON: {"username":"...","password":"..."}',
    expected: { method: 'POST', body: ['username','password'] }
  });
});

// CORS / preflight convenience (some browsers / tools may send OPTIONS)
router.options('/login', (req: Request, res: Response) => {
  res.setHeader('Allow', 'POST, OPTIONS');
  res.status(204).end();
});

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
    const adminUsername = process.env.ADMIN_USERNAME || (process.env.NODE_ENV !== 'production' ? 'admin' : '');
    const adminPassword = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV !== 'production' ? 'GanpatPortfolio2024!' : '');

    if (process.env.NODE_ENV === 'production' && (!adminUsername || !adminPassword)) {
      // Provide safe diagnostics to help configuration in production
      const details = {
        hasUsername: Boolean(adminUsername),
        hasPassword: Boolean(adminPassword),
        nodeEnv: process.env.NODE_ENV
      };
      console.error('Admin login config error:', details);
      return res.status(500).json({ error: 'Admin credentials are not configured', details });
    }

    if (username !== adminUsername || password !== adminPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { username, role: 'admin' },
      JWT_SECRET || 'dev_fallback_insecure_jwt_secret',
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

// Get dashboard stats
router.get('/dashboard', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    // Get counts from all tables
    const [projectsResult, skillsResult, messagesResult, analyticsResult] = await Promise.all([
      supabase.from('projects').select('id', { count: 'exact' }),
      supabase.from('skills').select('id', { count: 'exact' }),
      supabase.from('contact_messages').select('id', { count: 'exact' }),
      supabase.from('analytics').select('id', { count: 'exact' })
    ]);

    // Get recent messages
    const { data: recentMessages } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    // Get page views for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: recentViews } = await supabase
      .from('analytics')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    res.json({
      stats: {
        projects: projectsResult.count || 0,
        skills: skillsResult.count || 0,
        messages: messagesResult.count || 0,
        pageViews: analyticsResult.count || 0
      },
      recentMessages: recentMessages || [],
      recentViews: recentViews || []
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});


// Manage projects
// List projects (admin)
router.get('/projects', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(projects || []);
  } catch (error) {
    console.error('List projects (admin) error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

router.post('/projects', authenticateAdmin, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Extract only valid project fields
    const {
      title,
      description,
      image_url,
      category,
      technologies,
      demo_url,
      github_url,
      featured,
      status,
      sort_order,
      start_date,
      end_date
    } = req.body;

    const projectData = {
      title,
      description,
      image_url,
      category,
      technologies: Array.isArray(technologies) ? technologies : (technologies ? technologies.split(',').map((t: string) => t.trim()) : []),
      demo_url,
      github_url,
      featured: featured || false,
      status: status || 'completed',
      sort_order: sort_order || 0,
      start_date,
      end_date
    };

    const { data: project, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

router.put('/projects/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Extract only valid project fields
    const {
      title,
      description,
      image_url,
      category,
      technologies,
      demo_url,
      github_url,
      featured,
      status,
      sort_order,
      start_date,
      end_date
    } = req.body;

    const updateData = {
      title,
      description,
      image_url,
      category,
      technologies: Array.isArray(technologies) ? technologies : (technologies ? technologies.split(',').map((t: string) => t.trim()) : []),
      demo_url,
      github_url,
      featured,
      status,
      sort_order,
      start_date,
      end_date,
      updated_at: new Date().toISOString()
    };

    const { data: project, error } = await supabase
      .from('projects')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

router.delete('/projects/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});


// Get all contact messages
router.get('/messages', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: messages, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(messages);
  } catch (error) {
    console.error('Fetch messages error:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark message as read
router.put('/messages/:id/read', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: message, error } = await supabase
      .from('contact_messages')
      .update({ status: 'read', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(message);
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// Update message status (flexible endpoint)
router.patch('/messages/:id/status', authenticateAdmin, [
  body('status').isIn(['unread', 'read', 'replied']).withMessage('Invalid status. Must be unread, read, or replied'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const { data: message, error } = await supabase
      .from('contact_messages')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(message);
  } catch (error) {
    console.error('Update message status error:', error);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

// ==================== SKILLS MANAGEMENT ====================

// Get all skills
router.get('/skills', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: skills, error } = await supabase
      .from('skills')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(skills);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Create skill
router.post('/skills', authenticateAdmin, [
  body('name').notEmpty().withMessage('Skill name is required'),
  body('level').isInt({ min: 0, max: 100 }).withMessage('Level must be between 0 and 100'),
  body('category').notEmpty().withMessage('Category is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { data: skill, error } = await supabase
      .from('skills')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(skill);
  } catch (error) {
    console.error('Error creating skill:', error);
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

// Update skill
router.put('/skills/:id', authenticateAdmin, [
  body('name').optional().notEmpty(),
  body('level').optional().isInt({ min: 0, max: 100 }),
  body('category').optional().notEmpty(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Filter out JWT-related fields if they exist
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => 
        !['iat', 'exp', 'sub', 'aud', 'iss'].includes(key)
      )
    );

    const { data: skill, error } = await supabase
      .from('skills')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(skill);
  } catch (error) {
    console.error('Error updating skill:', error);
    res.status(500).json({ error: 'Failed to update skill' });
  }
});

// Delete skill
router.delete('/skills/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('skills')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting skill:', error);
    res.status(500).json({ error: 'Failed to delete skill' });
  }
});

// ==================== EXPERIENCES MANAGEMENT ====================

// Get all experiences
router.get('/experiences', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: experiences, error } = await supabase
      .from('experiences')
      .select('*')
      .order('start_date', { ascending: false });

    if (error) throw error;
    
    // Convert description array to string for frontend
    const processedExperiences = experiences?.map(experience => ({
      ...experience,
      description: Array.isArray(experience.description) 
        ? experience.description.join('\n') 
        : experience.description || ''
    }));
    
    res.json(processedExperiences);
  } catch (error) {
    console.error('Error fetching experiences:', error);
    res.status(500).json({ error: 'Failed to fetch experiences' });
  }
});

// Create experience
router.post('/experiences', authenticateAdmin, [
  body('title').notEmpty().withMessage('Title is required'),
  body('company').notEmpty().withMessage('Company is required'),
  body('period').notEmpty().withMessage('Period is required'),
  body('type').isIn(['experience', 'education']).withMessage('Type must be experience or education'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Process the description field to convert string to array if needed
    const experienceData = { ...req.body };
    if (experienceData.description && typeof experienceData.description === 'string') {
      // Split description by newlines and filter out empty lines
      experienceData.description = experienceData.description
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
    }

    const { data: experience, error } = await supabase
      .from('experiences')
      .insert([experienceData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(experience);
  } catch (error) {
    console.error('Error creating experience:', error);
    res.status(500).json({ error: 'Failed to create experience' });
  }
});

// Update experience
router.put('/experiences/:id', authenticateAdmin, [
  body('title').optional().notEmpty(),
  body('company').optional().notEmpty(),
  body('period').optional().notEmpty(),
  body('type').optional().isIn(['experience', 'education']),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const updateData = req.body;

    // Filter out JWT-related fields if they exist
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => 
        !['iat', 'exp', 'sub', 'aud', 'iss'].includes(key)
      )
    );

    // Process the description field to convert string to array if needed
    if (filteredData.description && typeof filteredData.description === 'string') {
      filteredData.description = filteredData.description
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
    }

    const { data: experience, error } = await supabase
      .from('experiences')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(experience);
  } catch (error) {
    console.error('Error updating experience:', error);
    res.status(500).json({ error: 'Failed to update experience' });
  }
});

// Delete experience
router.delete('/experiences/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('experiences')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Experience deleted successfully' });
  } catch (error) {
    console.error('Error deleting experience:', error);
    res.status(500).json({ error: 'Failed to delete experience' });
  }
});

// ==================== PERSONAL INFO MANAGEMENT ====================

// Get personal info
router.get('/personal-info', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: personalInfo, error } = await supabase
      .from('personal_info')
      .select('*')
      .limit(1)
      .single();

    if (error) throw error;
    res.json(personalInfo);
  } catch (error) {
    console.error('Error fetching personal info:', error);
    res.status(500).json({ error: 'Failed to fetch personal information' });
  }
});

// Update personal info
router.put('/personal-info', authenticateAdmin, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('email').optional().isEmail().withMessage('Must be a valid email'),
  body('phone').optional().isString().withMessage('Phone must be a string'),
  body('location').optional().notEmpty().withMessage('Location cannot be empty'),
  body('website_url').optional().isURL().withMessage('Website URL must be valid'),
  body('github_url').optional().isURL().withMessage('GitHub URL must be valid'),
  body('linkedin_url').optional().isURL().withMessage('LinkedIn URL must be valid'),
  body('leetcode_url').optional().isURL().withMessage('LeetCode URL must be valid'),
  body('twitter_url').optional().isURL().withMessage('Twitter URL must be valid'),
  body('instagram_url').optional().isURL().withMessage('Instagram URL must be valid'),
  body('bio').optional().isString().withMessage('Bio must be a string'),
  body('journey').optional().isString().withMessage('Journey must be a string'),
  body('years_of_experience').optional().isInt({ min: 0 }).withMessage('Years of experience must be a positive number'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const updateData = req.body;

    // Filter out JWT-related fields if they exist
    const filteredData = Object.fromEntries(
      Object.entries(updateData).filter(([key]) => 
        !['iat', 'exp', 'sub', 'aud', 'iss'].includes(key)
      )
    );

    // Get existing personal info to determine if we should update or create
    const { data: existingInfo } = await supabase
      .from('personal_info')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existingInfo) {
      // Update existing record
      const { data: personalInfo, error } = await supabase
        .from('personal_info')
        .update(filteredData)
        .eq('id', existingInfo.id)
        .select()
        .single();

      if (error) throw error;
      result = personalInfo;
    } else {
      // Create new record
      const { data: personalInfo, error } = await supabase
        .from('personal_info')
        .insert([filteredData])
        .select()
        .single();

      if (error) throw error;
      result = personalInfo;
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating personal info:', error);
    res.status(500).json({ error: 'Failed to update personal information' });
  }
});

// ==================== RESUME UPLOAD ====================

// Upload resume (PDF) - Admin only using Supabase Storage
router.post('/upload/resume', authenticateAdmin, resumeUpload.single('resume'), async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    console.log('Resume upload request received:', {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype
    });

    // Initialize Supabase client for uploads
    const { createClient } = require('@supabase/supabase-js');
    const uploadSupabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Delete any existing resume files first (keep only latest)
    try {
      const { data: existingFiles } = await uploadSupabase.storage
        .from('Portfolio-storage')
        .list('resumes', { limit: 100 });

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map((file: any) => `resumes/${file.name}`);
        await uploadSupabase.storage
          .from('Portfolio-storage')
          .remove(filesToDelete);
        console.log('Removed existing resume files');
      }
    } catch (cleanupError) {
      console.warn('Could not clean up existing resumes:', cleanupError);
      // Continue with upload even if cleanup fails
    }

    // Generate unique filename for resume
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `resumes/resume_${timestamp}_${randomId}.pdf`;
    
    console.log('Generated resume filename:', fileName);

    // Upload to Supabase Storage
    const { data, error } = await uploadSupabase.storage
      .from('Portfolio-storage')
      .upload(fileName, req.file.buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ 
        error: 'Failed to upload resume',
        details: error.message 
      });
    }

    console.log('Resume uploaded successfully:', data.path);

    // Get public URL
    const { data: publicUrlData } = uploadSupabase.storage
      .from('Portfolio-storage')
      .getPublicUrl(fileName);

    // Update personal info with new resume URL
    try {
      // First get the existing personal info to get the ID
      const { data: existingInfo } = await supabase
        .from('personal_info')
        .select('id')
        .limit(1)
        .single();

      if (existingInfo) {
        const { data: personalInfo, error: updateError } = await supabase
          .from('personal_info')
          .update({ resume_url: publicUrlData.publicUrl })
          .eq('id', existingInfo.id)
          .select()
          .single();

        if (updateError) {
          console.warn('Could not update personal info with resume URL:', updateError);
          // Continue and return URL even if DB update fails
        } else {
          console.log('Updated personal info with new resume URL');
        }
      } else {
        console.warn('No personal info record found to update');
      }
    } catch (dbError) {
      console.warn('Error updating personal info:', dbError);
    }

    const response = {
      success: true,
      url: publicUrlData.publicUrl,
      path: data.path,
      fileName: fileName,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    };

    console.log('Resume upload response:', response);
    res.json(response);

  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ 
      error: 'Failed to upload resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ==================== SITE SETTINGS MANAGEMENT ====================
// Get site settings (single row)
router.get('/settings', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = No rows found for single
      throw error;
    }

    if (!settings) {
      // Return defaults if no row yet
      return res.json({
        maintenance_mode: false,
        show_analytics: true,
        featured_sections: ['projects', 'skills', 'experiences'],
        hero_headline: null,
        hero_subheadline: null
      });
    }
    res.json(settings);
  } catch (error) {
    console.error('Error fetching site settings:', error);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

// Update site settings (upsert single row)
router.put('/settings', authenticateAdmin, [
  body('maintenance_mode').optional().isBoolean(),
  body('show_analytics').optional().isBoolean(),
  body('featured_sections').optional().isArray(),
  body('hero_headline').optional().isString().isLength({ max: 200 }),
  body('hero_subheadline').optional().isString().isLength({ max: 400 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const allowedKeys = ['maintenance_mode','show_analytics','featured_sections','hero_headline','hero_subheadline'] as const;
    const updateData: Record<string, any> = {};
    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updateData[key] = (req.body as any)[key];
      }
    }
    updateData.updated_at = new Date().toISOString();

    // Check if a row exists
    const { data: existing, error: existingError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      throw existingError;
    }

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('site_settings')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      if (!updateData.featured_sections) {
        updateData.featured_sections = ['projects','skills','experiences'];
      }
      const { data, error } = await supabase
        .from('site_settings')
        .insert([updateData])
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating site settings:', error);
    res.status(500).json({ error: 'Failed to update site settings' });
  }
});

export default router;

