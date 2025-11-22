const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect, admin } = require('../middleware/authMiddleware.js');

const router = express.Router();

// Determine if we're in a serverless environment
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.FUNCTION_NAME

// Use /tmp for serverless, uploads for local
const uploadsDir = isServerless ? '/tmp/uploads' : path.join(process.cwd(), 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.warn('Unable to create uploads directory:', err.message);
  }
}

// Multer storage config
const storage = multer.diskStorage({
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

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// POST /api/upload - upload a single image file (admin only)
// NOTE: On Vercel, files are stored in /tmp which is ephemeral and cleared between requests.
// For production on Vercel, consider using external storage like AWS S3, Cloudinary, or Vercel Blob.
router.post('/', protect, admin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  
  // Warn if in serverless environment
  if (isServerless) {
    console.warn('File uploaded to ephemeral storage (/tmp) - consider using external storage service');
  }
  
  const publicPath = `/uploads/${req.file.filename}`;
  const absoluteUrl = `${req.protocol}://${req.get('host')}${publicPath}`;
  return res.status(201).json({ success: true, url: absoluteUrl, path: publicPath, filename: req.file.filename });
});

module.exports = router;
