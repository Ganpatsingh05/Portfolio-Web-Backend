import { Router, Request, Response } from 'express';
import supabase from '../lib/supabase';

const router = Router();

// Standard success helper
const ok = (res: Response, data: any) => res.json({ data });

const legacyVisibleSections = ['hero', 'about', 'skills', 'projects', 'experience', 'contact'] as const;
const defaultVisibleSections = ['hero', 'about', 'skills', 'projects', 'experience', 'certificates', 'contact'] as const;

const normalizeVisibleSections = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [...defaultVisibleSections];

  const sections = Array.from(new Set(value.filter((section): section is string => typeof section === 'string')));

  const isLegacySet =
    sections.length === legacyVisibleSections.length &&
    legacyVisibleSections.every(section => sections.includes(section));

  if (isLegacySet) {
    return [...defaultVisibleSections];
  }

  return sections;
};

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
    // Fetch all projects, then filter and sort in code for more reliable results
    const { data: allProjects, error } = await supabase
      .from('projects')
      .select('*');

    if (error) throw error;

    // Filter: only show visible projects (visible = true or visible = null/undefined)
    // Hide projects where visible is explicitly false
    const visibleProjects = (allProjects || []).filter((project: any) =>
      project.visible !== false
    );

    // Sort: by end_date (most recent first), then created_at
    // Projects with end_date come first, sorted by end_date descending
    // Projects without end_date come after, sorted by created_at descending
    const sortedProjects = visibleProjects.sort((a: any, b: any) => {
      // If both have end_date, sort by end_date (most recent first)
      if (a.end_date && b.end_date) {
        return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
      }
      // If only a has end_date, a comes first
      if (a.end_date && !b.end_date) {
        return -1;
      }
      // If only b has end_date, b comes first
      if (!a.end_date && b.end_date) {
        return 1;
      }
      // If neither has end_date, sort by created_at (most recent first)
      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });

    return ok(res, sortedProjects);
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

// Public: soft skills
router.get('/soft-skills', async (req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('soft_skills')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) throw error;
    return ok(res, data || []);
  } catch (err) {
    console.error('Public soft skills error:', err);
    res.status(500).json({ error: 'Failed to fetch soft skills' });
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

// Public: certificates
router.get('/certificates', async (req: Request, res: Response) => {
  try {
    // Fetch all certificates
    const { data: allCertificates, error } = await supabase
      .from('certificates')
      .select('*');

    if (error) throw error;

    // Filter: only show visible certificates (visible = true or visible = null/undefined)
    // Hide certificates where visible is explicitly false
    const visibleCertificates = (allCertificates || []).filter((cert: any) =>
      cert.visible !== false
    );

    // Sort: by issue_date descending (most recent first)
    const sortedCertificates = visibleCertificates.sort((a: any, b: any) => {
      const aDate = a.issue_date ? new Date(a.issue_date).getTime() : 0;
      const bDate = b.issue_date ? new Date(b.issue_date).getTime() : 0;
      return bDate - aDate;
    });

    return ok(res, sortedCertificates);
  } catch (err) {
    console.error('Public certificates error:', err);
    res.status(500).json({ error: 'Failed to fetch certificates' });
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
      visible_sections: normalizeVisibleSections(settingsObj.visible_sections),
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
