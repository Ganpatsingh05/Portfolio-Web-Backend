import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import supabase from '../lib/supabase';
import { sendContactNotification } from '../lib/email';

const router = Router();
const EMAIL_SEND_TIMEOUT_MS = Number.parseInt(process.env.EMAIL_SEND_TIMEOUT_MS || '6000', 10);

// List of disposable email domains
const disposableEmailDomains = [
  '10minutemail.com', 'tempmail.com', 'guerrillamail.com', 'mailinator.com',
  'throwaway.email', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
  'getnada.com', 'maildrop.cc', 'yopmail.com', 'mohmal.com', 'sharklasers.com',
  'bugmenot.com', 'dispostable.com', 'spamgourmet.com', 'mintemail.com'
];

// Custom email validation middleware
const validateEmailDomain = (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (email) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain && disposableEmailDomains.includes(domain)) {
      return res.status(400).json({ 
        error: 'Disposable or temporary email addresses are not allowed. Please use a permanent email address.' 
      });
    }
  }
  next();
};

// Submit contact form
router.post('/', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('message').notEmpty().withMessage('Message is required'),
  validateEmailDomain
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message, phone } = req.body;

    // Save to database
    const { data: contactMessage, error: dbError } = await supabase
      .from('contact_messages')
      .insert([{
        name,
        email,
        subject,
        message,
        phone,
        status: 'unread'
      }])
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: 'Failed to save message' });
    }

    // Send email notification (do not fail entire request if delivery fails)
    // Add timeout to prevent email sending from blocking the request
    let emailSent = false;
    try {
      const emailTimeout = new Promise<boolean>((resolve) =>
        setTimeout(() => {
          console.warn(`⚠️ Email sending timed out after ${EMAIL_SEND_TIMEOUT_MS}ms`);
          resolve(false);
        }, EMAIL_SEND_TIMEOUT_MS)
      );

      emailSent = await Promise.race([
        sendContactNotification({ name, email, subject, message, phone }),
        emailTimeout
      ]);
    } catch (err) {
      console.error('Email notification error:', err);
    }

    res.status(201).json({ 
      message: emailSent
        ? 'Message sent successfully'
        : 'Message saved successfully, but email notification could not be delivered.',
      id: contactMessage.id,
      email_sent: emailSent,
    });

  } catch (error) {
    console.error('Error processing contact form:', error);
    res.status(500).json({ error: 'Failed to process contact form' });
  }
});

// Get all contact messages (admin only)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { data: messages, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(messages);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Update message status (admin only)
router.patch('/:id/status', [
  body('status').isIn(['unread', 'read', 'replied']).withMessage('Invalid status'),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status } = req.body;

    const { data: message, error } = await supabase
      .from('contact_messages')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(message);
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ error: 'Failed to update message status' });
  }
});

export default router;
