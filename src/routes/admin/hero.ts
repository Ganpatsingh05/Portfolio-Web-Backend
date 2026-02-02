import { Router, Request, Response } from 'express';
import supabase from '../../lib/supabase';
import { body, validationResult } from 'express-validator';
import { authenticateAdmin } from '../auth';

const router = Router();

// Helper to filter out JWT fields and system fields from request body
const filterSystemFields = (data: Record<string, any>) => {
  const systemFields = ['iat', 'exp', 'sub', 'aud', 'iss', 'id', 'created_at', 'updated_at'];
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !systemFields.includes(key))
  );
};

// GET /hero - Get hero section data
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: hero, error } = await supabase
      .from('hero_section')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    
    // Map DB fields to frontend expected fields
    const result = hero ? {
      id: hero.id,
      greeting: hero.greeting || 'Hello, I\'m',
      name: hero.name || '',
      typing_texts: hero.titles || [],
      quote: hero.description || '',
      social_links: hero.social_links || {},
      created_at: hero.created_at,
      updated_at: hero.updated_at
    } : {};
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching hero data:', error);
    res.status(500).json({ error: 'Failed to fetch hero data' });
  }
});

// PUT /hero - Update hero section
router.put('/', authenticateAdmin, [
  body('greeting').optional({ nullable: true }).isString(),
  body('name').optional({ nullable: true }).isString(),
  body('typing_texts').optional({ nullable: true }).isArray(),
  body('quote').optional({ nullable: true }).isString(),
  body('social_links').optional({ nullable: true }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const inputData = filterSystemFields(req.body);
    
    // Map frontend fields to DB fields
    const dbData: Record<string, any> = {
      updated_at: new Date().toISOString()
    };
    if (inputData.greeting !== undefined) dbData.greeting = inputData.greeting;
    if (inputData.name !== undefined) dbData.name = inputData.name;
    if (inputData.typing_texts !== undefined) dbData.titles = inputData.typing_texts;
    if (inputData.quote !== undefined) dbData.description = inputData.quote;
    if (inputData.social_links !== undefined) dbData.social_links = inputData.social_links;

    // Check if record exists
    const { data: existingHero } = await supabase
      .from('hero_section')
      .select('id')
      .limit(1)
      .maybeSingle();

    let result;
    if (existingHero) {
      // Update existing
      const { data: hero, error } = await supabase
        .from('hero_section')
        .update(dbData)
        .eq('id', existingHero.id)
        .select()
        .single();

      if (error) throw error;
      result = hero;
    } else {
      // Create new - ensure name is provided
      if (!dbData.name) {
        return res.status(400).json({ error: 'Name is required to create hero section' });
      }
      const { data: hero, error } = await supabase
        .from('hero_section')
        .insert([dbData])
        .select()
        .single();

      if (error) throw error;
      result = hero;
    }

    // Map response back to frontend fields
    const response = {
      id: result.id,
      greeting: result.greeting || 'Hello, I\'m',
      name: result.name || '',
      typing_texts: result.titles || [],
      quote: result.description || '',
      social_links: result.social_links || {},
      created_at: result.created_at,
      updated_at: result.updated_at
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating hero data:', error);
    res.status(500).json({ error: 'Failed to update hero data' });
  }
});

export default router;
