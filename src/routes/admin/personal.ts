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

// GET /personal-info - Get personal info
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
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

// PUT /personal-info - Update personal info
router.put('/', authenticateAdmin, [
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('title').optional().notEmpty().withMessage('Title cannot be empty'),
  body('email').optional().isEmail().withMessage('Must be a valid email'),
  body('phone').optional().isString(),
  body('location').optional().notEmpty(),
  body('website_url').optional().isURL().withMessage('Website URL must be valid'),
  body('github_url').optional().isURL().withMessage('GitHub URL must be valid'),
  body('linkedin_url').optional().isURL().withMessage('LinkedIn URL must be valid'),
  body('leetcode_url').optional().isURL().withMessage('LeetCode URL must be valid'),
  body('bio').optional().isString(),
  body('journey').optional().isString(),
  body('years_of_experience').optional().isInt({ min: 0 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filteredData = filterJwtFields(req.body);

    // Check if record exists
    const { data: existingInfo } = await supabase
      .from('personal_info')
      .select('id')
      .limit(1)
      .single();

    let result;
    if (existingInfo) {
      // Update existing
      const { data: personalInfo, error } = await supabase
        .from('personal_info')
        .update(filteredData)
        .eq('id', existingInfo.id)
        .select()
        .single();

      if (error) throw error;
      result = personalInfo;
    } else {
      // Create new
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

export default router;
