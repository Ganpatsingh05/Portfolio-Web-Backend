import { Router, Request, Response } from 'express';
import supabase from '../lib/supabase';

const router = Router();

// Standard success helper
const ok = (res: Response, data: any) => res.json({ data });

// Public: personal info (single row)
router.get('/personal-info', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('personal_info')
      .select('*')  
      .limit(1)
      .single();
    if (error) throw error;
    return ok(res, data || null);
  } catch (err) {
    console.error('Public personal-info error:', err);
    res.status(500).json({ error: 'Failed to fetch personal info' });
  }
});

// Public: projects
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return ok(res, data || []);
  } catch (err) {
    console.error('Public projects error:', err);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Public: skills
router.get('/skills', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return ok(res, data || []);
  } catch (err) {
    console.error('Public skills error:', err);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// Public: experiences
router.get('/experiences', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('experiences')
      .select('*')
      .order('start_date', { ascending: false });
    if (error) throw error;
    return ok(res, data || []);
  } catch (err) {
    console.error('Public experiences error:', err);
    res.status(500).json({ error: 'Failed to fetch experiences' });
  }
});

// Public: hero section
router.get('/hero', async (req: Request, res: Response) => {
  try {
    const { data: hero, error } = await supabase
      .from('hero_section')
      .select('*')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    
    // Map DB fields to frontend expected fields
    const result = hero ? {
      greeting: hero.greeting || "Hello, I'm",
      name: hero.name || '',
      typing_texts: hero.titles || [],
      quote: hero.description || '',
      social_links: hero.social_links || {}
    } : {
      greeting: "Hello, I'm",
      name: '',
      typing_texts: [],
      quote: '',
      social_links: {}
    };
    
    return ok(res, result);
  } catch (err) {
    console.error('Public hero section error:', err);
    res.status(500).json({ error: 'Failed to fetch hero section' });
  }
});

// Public: site settings (limited fields for frontend)
router.get('/settings', async (req: Request, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*');

    if (error) throw error;

    // Convert key-value array to object
    const settingsObj = settings?.reduce((acc: Record<string, any>, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {}) || {};

    // Return only public-facing settings
    return ok(res, {
      maintenance_mode: settingsObj.maintenance_mode ?? false,
      maintenance_message: settingsObj.maintenance_message ?? 'Site is under maintenance. Please check back soon.',
      visible_sections: settingsObj.visible_sections ?? ['hero', 'about', 'skills', 'projects', 'experience', 'contact'],
      show_footer: settingsObj.show_footer ?? true,
      show_navigation: settingsObj.show_navigation ?? true,
      enable_animations: settingsObj.enable_animations ?? true,
      contact_form_enabled: settingsObj.contact_form_enabled ?? true,
      show_social_links: settingsObj.show_social_links ?? true,
      show_resume_button: settingsObj.show_resume_button ?? true,
      default_theme: settingsObj.default_theme ?? 'system',
      accent_color: settingsObj.accent_color ?? '#3B82F6',
    });
  } catch (err) {
    console.error('Public settings error:', err);
    res.status(500).json({ error: 'Failed to fetch site settings' });
  }
});

// Public: analytics capture (generic)
router.post('/analytics', async (req: Request, res: Response) => {
  try {
    const { event_type = 'event', event_data = {} } = req.body || {};
    const ip_address = (req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '').toString();
    const user_agent = req.get('user-agent') || '';
    const referrer = req.get('referer') || req.get('referrer') || '';

    const { error } = await supabase
      .from('analytics')
      .insert([{ event_type, event_data, ip_address, user_agent, referrer }]);
    if (error) throw error;
    return res.status(201).json({ message: 'Captured' });
  } catch (err) {
    console.error('Public analytics error:', err);
    res.status(500).json({ error: 'Failed to capture analytics' });
  }
});

export default router;
