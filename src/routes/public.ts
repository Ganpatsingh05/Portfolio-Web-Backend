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
