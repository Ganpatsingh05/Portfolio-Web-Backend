import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import supabase from '../../lib/supabase';
import { authenticateAdmin } from '../auth';

const router = Router();

// GET /projects - List all projects (admin)
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(projects || []);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// POST /projects - Create project
router.post('/', authenticateAdmin, [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title, description, image_url, category, technologies,
      demo_url, github_url, featured, status, sort_order,
      start_date, end_date
    } = req.body;

    const projectData = {
      title,
      description,
      image_url,
      category,
      technologies: Array.isArray(technologies) 
        ? technologies 
        : (technologies ? technologies.split(',').map((t: string) => t.trim()) : []),
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

// PUT /projects/:id - Update project
router.put('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      title, description, image_url, category, technologies,
      demo_url, github_url, featured, status, sort_order,
      start_date, end_date
    } = req.body;

    const updateData = {
      title,
      description,
      image_url,
      category,
      technologies: Array.isArray(technologies)
        ? technologies
        : (technologies ? technologies.split(',').map((t: string) => t.trim()) : []),
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

// DELETE /projects/:id - Delete project
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
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

export default router;
