import { Express, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { processCustomerPhoto, getDriveClient } from './googleIntegration';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create temp directory if it doesn't exist
    const uploadDir = path.join(os.tmpdir(), 'clean-machine-uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `photo-${uniqueSuffix}${ext}`);
  }
});

// Create multer instance with storage configuration
const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max size
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

/**
 * Register file upload routes
 */
export function registerFileUploadRoutes(app: Express) {
  // Route for uploading a photo
  app.post('/api/upload-photo', upload.single('photo'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      // Get form data
      const customerName = req.body.customerName || '';
      const customerPhone = req.body.customerPhone || '';
      const customerEmail = req.body.customerEmail || '';
      const vehicleInfo = req.body.vehicleInfo || '';
      const message = req.body.message || '';
      
      if (!customerName) {
        return res.status(400).json({ error: 'Customer name is required' });
      }
      
      if (!customerPhone && !customerEmail) {
        return res.status(400).json({ error: 'Either phone number or email is required' });
      }
      
      if (!vehicleInfo) {
        return res.status(400).json({ error: 'Vehicle information is required' });
      }
      
      const contactInfo = customerPhone ? 
        `Phone: ${customerPhone}` : 
        (customerEmail ? `Email: ${customerEmail}` : 'No contact info');
      
      console.log(`Received photo upload from ${customerName} (${contactInfo})`, {
        filename: req.file.filename,
        size: req.file.size,
        vehicleInfo: vehicleInfo,
        message: message
      });
      
      // Create a file:// URL for the temporary file
      const fileUrl = `file://${req.file.path}`;
      
      console.log('Processing photo upload with details:', {
        name: customerName,
        phone: customerPhone || 'not provided',
        email: customerEmail || 'not provided',
        vehicle: vehicleInfo,
        fileSize: req.file.size,
        tempPath: req.file.path
      });
      
      // Process the photo - store in Google Drive
      try {
        console.log('Attempting to process customer photo in Google Drive...');
        
        // Extra debug for Google Drive status
        const drive = getDriveClient();
        if (!drive) {
          console.error('Google Drive API client is not initialized!');
        } else {
          try {
            // Test the Google Drive API connection
            const testResult = await drive.files.list({
              pageSize: 1,
              fields: 'files(id, name)'
            });
            console.log('Google Drive API connection test succeeded:', 
                       testResult.data.files ? `Found ${testResult.data.files.length} files` : 'No files found');
          } catch (testError) {
            console.error('Google Drive API connection test failed:', testError);
          }
        }
        
        const result = await processCustomerPhoto(
          fileUrl,
          customerPhone,
          customerName,
          vehicleInfo,
          customerEmail
        );
        
        console.log('Photo processing result:', result ? `Success: ${result}` : 'Failed: null result');
      
        if (result) {
        // If the user included a message, process it with OpenAI
        let aiResponse = '';
        if (message) {
          // This could be implemented to send the message to OpenAI similar to the SMS route
          aiResponse = 'Thank you for your message. We have received your photo and will get back to you soon.';
        }
        
        // Success response
        res.status(200).json({
          success: true,
          message: 'Photo uploaded successfully',
          folderLink: result,
          aiResponse: aiResponse
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to process photo',
          message: 'The photo was received but could not be stored properly'
        });
      }
      } catch (processError: any) {
        console.error('Error in photo processing:', processError);
        res.status(500).json({ 
          error: 'Failed to process photo',
          message: processError.message || 'An error occurred while processing the photo'
        });
        return;
      }
    } catch (error: any) {
      console.error('Error handling photo upload:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
      });
    }
  });
  
  // Route for checking upload status/health
  app.get('/api/upload-status', (req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'ok',
      message: 'Photo upload service is running',
      maxFileSize: '5MB',
      acceptedTypes: ['image/jpeg', 'image/png', 'image/gif']
    });
  });
  
  // Route for processing photos from URLs
  app.post('/api/process-photo', async (req: Request, res: Response) => {
    try {
      const { photoUrl, customerName, phoneNumber, customerEmail, vehicleInfo } = req.body;
      
      if (!photoUrl) {
        return res.status(400).json({ error: 'Photo URL is required' });
      }
      
      if (!customerName) {
        return res.status(400).json({ error: 'Customer name is required' });
      }
      
      if (!phoneNumber && !customerEmail) {
        return res.status(400).json({ error: 'Either phone number or email is required' });
      }
      
      if (!vehicleInfo) {
        return res.status(400).json({ error: 'Vehicle information is required' });
      }
      
      const contactInfo = phoneNumber ? 
        `Phone: ${phoneNumber}` : 
        (customerEmail ? `Email: ${customerEmail}` : 'No contact info');
      
      console.log(`Processing photo from URL for ${customerName} (${contactInfo})`, {
        url: photoUrl,
        vehicleInfo: vehicleInfo
      });
      
      // Process the photo - download and store in Google Drive
      const result = await processCustomerPhoto(
        photoUrl,
        phoneNumber || '',
        customerName,
        vehicleInfo,
        customerEmail || ''
      );
      
      if (result) {
        // Success response
        res.status(200).json({
          success: true,
          message: 'Photo processed successfully',
          folderLink: result,
          url: photoUrl
        });
      } else {
        res.status(500).json({ 
          error: 'Failed to process photo',
          message: 'The photo URL was received but could not be processed properly'
        });
      }
    } catch (error: any) {
      console.error('Error processing photo from URL:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred'
      });
    }
  });
}