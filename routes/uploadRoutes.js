const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, admin } = require('../middleware/authMiddleware.js');
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const router = express.Router();

// Determine if we're in a serverless environment or Cloudinary is configured
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME;
const useCloudinary = process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET;

let storage;
let upload;

if (useCloudinary) {
  // Configure Cloudinary
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // Cloudinary storage for serverless/production
  storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: 'raddazle-products',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      transformation: [{ width: 1000, height: 1000, crop: 'limit', quality: 'auto' }],
    },
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  };

  upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
} else {
  // Local storage fallback for development
  const uploadsDir = isServerless ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true });
    } catch (err) {
      console.warn('Unable to create uploads directory:', err.message);
    }
  }

  storage = multer.diskStorage({
    destination(req, file, cb) {
      cb(null, uploadsDir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
      cb(null, `${Date.now()}_${base}${ext}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  };

  upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
}

// POST /api/upload - upload a single image file (admin only)
router.post('/', protect, admin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  if (useCloudinary) {
    // Cloudinary returns the URL in req.file.path
    return res.status(201).json({
      success: true,
      url: req.file.path,
      filename: req.file.filename,
      public_id: req.file.filename,
    });
  } else {
    // Warn if in serverless environment without Cloudinary
    if (isServerless) {
      console.warn('File uploaded to ephemeral storage (/tmp) - images will not persist! Configure Cloudinary for production.');
    }

    const publicPath = `/uploads/${req.file.filename}`;
    const absoluteUrl = `${req.protocol}://${req.get('host')}${publicPath}`;
    return res.status(201).json({ success: true, url: absoluteUrl, path: publicPath, filename: req.file.filename });
  }
});

// DELETE /api/upload/:public_id - delete an image from Cloudinary (admin only)
router.delete('/:public_id', protect, admin, async (req, res) => {
  if (!useCloudinary) {
    return res.status(400).json({ success: false, message: 'Cloudinary not configured' });
  }

  try {
    const { public_id } = req.params;
    const result = await cloudinary.uploader.destroy(`raddazle-products/${public_id}`);
    
    if (result.result === 'ok') {
      return res.status(200).json({ success: true, message: 'Image deleted successfully' });
    } else {
      return res.status(400).json({ success: false, message: 'Failed to delete image', result });
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
