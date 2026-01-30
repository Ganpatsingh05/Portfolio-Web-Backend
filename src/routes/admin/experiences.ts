import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import supabase from '../../lib/supabase';
import { authenticateAdmin } from '../auth';

const router = Router();

// Helper to filter out JWT fields from request body
const filterJwtFields = (data: Record<string, any>) => {
  const jwtFields = ['iat', 'exp', 'sub', 'aud', 'iss'];
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !jwtFields.includes(key))
  );
};

// Helper to process description field (string to array)
const processDescription = (data: Record<string, any>) => {
  if (data.description && typeof data.description === 'string') {
    data.description = data.description
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
  }
  return data;
};

// GET /experiences - List all experiences
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
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
    
    res.json(processedExperiences || []);
  } catch (error) {
    console.error('Error fetching experiences:', error);
    res.status(500).json({ error: 'Failed to fetch experiences' });
  }
});

// POST /experiences - Create experience
router.post('/', authenticateAdmin, [
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

    const experienceData = processDescription({ ...req.body });

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

// PUT /experiences/:id - Update experience
router.put('/:id', authenticateAdmin, [
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
    let filteredData = filterJwtFields(req.body);
    filteredData = processDescription(filteredData);

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

// DELETE /experiences/:id - Delete experience
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
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

export default router;
