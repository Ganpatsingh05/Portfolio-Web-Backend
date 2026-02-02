import { Router, Request, Response } from 'express';
import multer from 'multer';
import supabase from '../lib/supabase';

const router = Router();

// Bucket name constant
const BUCKET_NAME = 'portfolio-storage';

// Configure multer for image uploads
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req: Request, file: any, cb: any) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  },
});

// Configure multer for resume uploads (PDF files)
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for resumes
  },
  fileFilter: (req: Request, file: any, cb: any) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed for resume!'));
    }
  },
});

// Helper function to get file extension
const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || '';
};

// Helper function to sanitize filename
const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};

// Upload image
router.post('/image', imageUpload.single('image'), async (req: any, res: Response) => {
  try {
    
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // Generate unique filename with proper extension
    const fileExtension = getFileExtension(req.file.originalname);
    const sanitizedName = sanitizeFilename(req.file.originalname.split('.')[0]);
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `images/${sanitizedName}_${randomId}.${fileExtension}`;


    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ 
        error: 'Failed to upload image',
        details: error.message 
      });
    }


    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const response = {
      success: true,
      url: publicUrlData.publicUrl,
      path: data.path,
      fileName: fileName,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    };

    res.json(response);

  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Upload resume (PDF)
router.post('/resume', resumeUpload.single('resume'), async (req: any, res: Response) => {
  try {
    
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file provided' });
    }

    // Delete any existing resume files first (optional - keeps only latest)
    try {
      const { data: existingFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list('resumes', { limit: 100 });

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(file => `resumes/${file.name}`);
        await supabase.storage
          .from(BUCKET_NAME)
          .remove(filesToDelete);
      }
    } catch (cleanupError) {
      console.warn('Could not clean up existing resumes:', cleanupError);
      // Continue with upload even if cleanup fails
    }

    // Generate unique filename for resume
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileName = `resumes/resume_${timestamp}_${randomId}.pdf`;
    

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, req.file.buffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', error);
      return res.status(500).json({ 
        error: 'Failed to upload resume',
        details: error.message 
      });
    }


    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const response = {
      success: true,
      url: publicUrlData.publicUrl,
      path: data.path,
      fileName: fileName,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype
    };

    res.json(response);

  } catch (error) {
    console.error('Error uploading resume:', error);
    res.status(500).json({ 
      error: 'Failed to upload resume',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete file
router.delete('/file/:fileName(*)', async (req: Request, res: Response) => {
  try {
    const fileName = decodeURIComponent(req.params.fileName);
    
    
    // Delete from Supabase Storage
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([fileName]);

    if (error) {
      console.error('Supabase delete error:', error);
      return res.status(500).json({ 
        error: 'Failed to delete file',
        details: error.message 
      });
    }

    res.json({ 
      success: true,
      message: 'File deleted successfully',
      fileName: fileName 
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      error: 'Failed to delete file',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get file info
router.get('/file/:fileName(*)', async (req: Request, res: Response) => {
  try {
    const fileName = decodeURIComponent(req.params.fileName);
    
    
    // Extract folder and filename
    const lastSlashIndex = fileName.lastIndexOf('/');
    const folder = lastSlashIndex > 0 ? fileName.substring(0, lastSlashIndex) : '';
    const fileNameOnly = fileName.substring(lastSlashIndex + 1);
    
    // Check if file exists
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folder, {
        search: fileNameOnly
      });

    if (error) {
      console.error('Supabase file check error:', error);
      return res.status(500).json({ 
        error: 'Failed to check file',
        details: error.message 
      });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    const response = {
      success: true,
      url: publicUrlData.publicUrl,
      fileName: fileName,
      metadata: data[0]
    };

    res.json(response);

  } catch (error) {
    console.error('Error getting file info:', error);
    res.status(500).json({ 
      error: 'Failed to get file info',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List files in a folder
router.get('/files/:folder?', async (req: Request, res: Response) => {
  try {
    const { folder } = req.params;
    const folderPath = folder || '';


    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(folderPath, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Supabase list error:', error);
      return res.status(500).json({ 
        error: 'Failed to list files',
        details: error.message 
      });
    }

    // Add public URLs to each file
    const filesWithUrls = data?.map(file => {
      const filePath = folderPath ? `${folderPath}/${file.name}` : file.name;
      const { data: publicUrlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        ...file,
        path: filePath,
        publicUrl: publicUrlData.publicUrl
      };
    }) || [];

    res.json({ 
      success: true,
      files: filesWithUrls,
      count: filesWithUrls.length 
    });

  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      error: 'Failed to list files',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    // Test Supabase storage connection
    const { data, error } = await supabase.storage
      .from('Portfolio-storage')
      .list('', { limit: 1 });

    if (error) {
      throw error;
    }

    res.json({
      status: 'healthy',
      storage: 'connected',
      bucketName: 'Portfolio-storage',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Upload service health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: 'Storage connection failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
