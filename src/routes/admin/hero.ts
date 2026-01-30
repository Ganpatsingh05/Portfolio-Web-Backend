import { Router, Request, Response } from 'express';
import supabase from '../../lib/supabase';
import { body, validationResult } from 'express-validator';
import { authenticateAdmin } from '../auth';

const router = Router();

// Helper to filter out JWT fields from request body
const filterJwtFields = (data: Record<string, any>) => {
  const jwtFields = ['iat', 'exp', 'sub', 'aud', 'iss'];
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !jwtFields.includes(key))
  );
};

// GET /hero - Get hero section data
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: hero, error } = await supabase
      .from('hero_section')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    res.json(hero || {});
  } catch (error) {
    console.error('Error fetching hero data:', error);
    res.status(500).json({ error: 'Failed to fetch hero data' });
  }
});

// PUT /hero - Update hero section
router.put('/', authenticateAdmin, [
  body('greeting').optional().isString(),
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('titles').optional().isArray().withMessage('Titles must be an array'),
  body('description').optional().isString(),
  body('cta_text').optional().isString(),
  body('cta_link').optional().isString(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filteredData = filterJwtFields(req.body);

    // Check if record exists
    const { data: existingHero } = await supabase
      .from('hero_section')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existingHero) {
      // Update existing
      const { data: hero, error } = await supabase
        .from('hero_section')
        .update(filteredData)
        .eq('id', existingHero.id)
        .select()
        .single();

      if (error) throw error;
      result = hero;
    } else {
      // Create new
      const { data: hero, error } = await supabase
        .from('hero_section')
        .insert([filteredData])
        .select()
        .single();

      if (error) throw error;
      result = hero;
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating hero data:', error);
    res.status(500).json({ error: 'Failed to update hero data' });
  }
});

export default router;
