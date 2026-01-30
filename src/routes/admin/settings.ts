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

// GET /settings - Get all settings
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*');

    if (error) throw error;

    // Convert to key-value object
    const settingsObj = settings?.reduce((acc: Record<string, any>, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {}) || {};

    res.json(settingsObj);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /settings - Update settings
router.put('/', authenticateAdmin, [
  body('settings').optional().isObject().withMessage('Settings must be an object'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filteredData = filterJwtFields(req.body);
    const settingsToUpdate = filteredData.settings || filteredData;

    // Upsert each setting
    const updates = Object.entries(settingsToUpdate).map(async ([key, value]) => {
      const { error } = await supabase
        .from('settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
      if (error) throw error;
    });

    await Promise.all(updates);

    // Fetch updated settings
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*');

    if (error) throw error;

    const settingsObj = settings?.reduce((acc: Record<string, any>, setting: any) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {}) || {};

    res.json(settingsObj);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// GET /settings/:key - Get specific setting
router.get('/:key', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { data: setting, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!setting) {
      return res.status(404).json({ error: 'Setting not found' });
    }

    res.json(setting);
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

export default router;
