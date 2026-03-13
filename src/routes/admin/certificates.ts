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

// GET /certificates - List all certificates
router.get('/', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { data: certificates, error } = await supabase
      .from('certificates')
      .select('*')
      .order('issue_date', { ascending: false });

    if (error) throw error;
    res.json(certificates || []);
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
});

// POST /certificates - Create certificate
router.post('/', authenticateAdmin, [
  body('title').notEmpty().withMessage('Certificate title is required'),
  body('issuer').notEmpty().withMessage('Issuer is required'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const filteredData = filterJwtFields(req.body);

    const { data: certificate, error } = await supabase
      .from('certificates')
      .insert([filteredData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(certificate);
  } catch (error) {
    console.error('Error creating certificate:', error);
    res.status(500).json({ error: 'Failed to create certificate' });
  }
});

// PUT /certificates/:id - Update certificate
router.put('/:id', authenticateAdmin, [
  body('title').optional().notEmpty(),
  body('issuer').optional().notEmpty(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const filteredData = filterJwtFields(req.body);

    const { data: certificate, error } = await supabase
      .from('certificates')
      .update(filteredData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json(certificate);
  } catch (error) {
    console.error('Error updating certificate:', error);
    res.status(500).json({ error: 'Failed to update certificate' });
  }
});

// DELETE /certificates/:id - Delete certificate
router.delete('/:id', authenticateAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('certificates')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ message: 'Certificate deleted successfully' });
  } catch (error) {
    console.error('Error deleting certificate:', error);
    res.status(500).json({ error: 'Failed to delete certificate' });
  }
});

export default router;
