import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import supabase from '../../lib/supabase';
import { authenticateAdmin } from '../auth';

const router = Router();

// Helper to filter out JWT fields and read-only fields from request body
const filterJwtFields = (data: Record<string, any>) => {
  const excludeFields = ['iat', 'exp', 'sub', 'aud', 'iss', 'id', 'created_at', 'updated_at'];
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => !excludeFields.includes(key))
  );
};

// GET /personal-info - Get personal info
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: personalInfo, error } = await supabase
      .from('personal_info')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    // Return empty object if no record exists yet
    res.json(personalInfo || {});
  } catch (error) {
    console.error('Error fetching personal info:', error);
    res.status(500).json({ error: 'Failed to fetch personal information' });
  }
});

// PUT /personal-info - Update personal info
router.put('/', authenticateAdmin, [
  body('id').optional({ nullable: true }),
  body('name').optional({ nullable: true }).isString(),
  body('title').optional({ nullable: true }).isString(),
  body('email').optional({ nullable: true }).isString(),
  body('phone').optional({ nullable: true }).isString(),
  body('location').optional({ nullable: true }).isString(),
  body('website_url').optional({ nullable: true }).isString(),
  body('github_url').optional({ nullable: true }).isString(),
  body('linkedin_url').optional({ nullable: true }).isString(),
  body('leetcode_url').optional({ nullable: true }).isString(),
  body('twitter_url').optional({ nullable: true }).isString(),
  body('resume_url').optional({ nullable: true }).isString(),
  body('bio').optional({ nullable: true }).isString(),
  body('footer_bio').optional({ nullable: true }).isString(),
  body('journey').optional({ nullable: true }).isString(),
  body('degree').optional({ nullable: true }).isString(),
  body('university').optional({ nullable: true }).isString(),
  body('education_period').optional({ nullable: true }).isString(),
  body('years_of_experience').optional({ nullable: true }),
  body('profile_image_url').optional({ nullable: true }).isString(),
  body('created_at').optional({ nullable: true }),
  body('updated_at').optional({ nullable: true }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', JSON.stringify(errors.array(), null, 2));
      console.log('Request body:', JSON.stringify(req.body, null, 2));
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
