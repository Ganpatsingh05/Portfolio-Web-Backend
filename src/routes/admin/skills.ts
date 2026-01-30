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

// GET /skills - List all skills
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: skills, error } = await supabase
      .from('skills')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(skills || []);
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ error: 'Failed to fetch skills' });
  }
});

// POST /skills - Create skill
router.post('/', authenticateAdmin, [
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

// PUT /skills/:id - Update skill
router.put('/:id', authenticateAdmin, [
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
    const filteredData = filterJwtFields(req.body);

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

// DELETE /skills/:id - Delete skill
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
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

export default router;
