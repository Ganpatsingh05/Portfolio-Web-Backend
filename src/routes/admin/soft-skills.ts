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

// GET /soft-skills - List all soft skills
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: softSkills, error } = await supabase
      .from('soft_skills')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json(softSkills || []);
  } catch (error) {
    console.error('Error fetching soft skills:', error);
    res.status(500).json({ error: 'Failed to fetch soft skills' });
  }
});

// POST /soft-skills - Create soft skill
router.post('/', authenticateAdmin, [
  body('name').notEmpty().withMessage('Skill name is required'),
  body('level').isInt({ min: 0, max: 100 }).withMessage('Level must be between 0 and 100'),
  body('icon_url').optional({ nullable: true }).isString(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { data: softSkill, error } = await supabase
      .from('soft_skills')
      .insert([req.body])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(softSkill);
  } catch (error) {
    console.error('Error creating soft skill:', error);
    res.status(500).json({ error: 'Failed to create soft skill' });
  }
});

// PUT /soft-skills/:id - Update soft skill
router.put('/:id', authenticateAdmin, [
  body('name').optional().notEmpty(),
  body('level').optional().isInt({ min: 0, max: 100 }),
  body('icon_url').optional({ nullable: true }).isString(),
  body('is_visible').optional().isBoolean(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const filteredData = filterJwtFields(req.body);

    const { data: softSkill, error } = await supabase
      .from('soft_skills')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!softSkill) {
      return res.status(404).json({ error: 'Soft skill not found' });
    }
    res.json(softSkill);
  } catch (error) {
    console.error('Error updating soft skill:', error);
    res.status(500).json({ error: 'Failed to update soft skill' });
  }
});

// DELETE /soft-skills/:id - Delete soft skill
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('soft_skills')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Soft skill deleted successfully' });
  } catch (error) {
    console.error('Error deleting soft skill:', error);
    res.status(500).json({ error: 'Failed to delete soft skill' });
  }
});

export default router;
