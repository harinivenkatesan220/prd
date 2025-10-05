const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
require('dotenv').config();

const router = express.Router();

const upload = multer({
  limits: {
    fileSize: (process.env.MAX_UPLOAD_SIZE_MB || 5) * 1024 * 1024 
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/json', 'text/csv', 'application/csv'];
    const extAllowed = ['.csv', '.json'];

    const hasValidMime = allowedTypes.includes(file.mimetype);
    const hasValidExt = extAllowed.some(ext => file.originalname.toLowerCase().endsWith(ext));

    if (hasValidMime || hasValidExt) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV and JSON are allowed.'));
    }
  }
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File required' });

  
  const id = 'u_' + uuidv4();
  const created_at = new Date().toISOString();

 
  const raw_data = req.file.buffer.toString();

  db.run(
    'INSERT INTO uploads (id, created_at, raw_data) VALUES (?, ?, ?)',
    [id, created_at, raw_data],
    (err) => {
      if (err) {
        console.error('DB Insert Error:', err);
        return res.status(500).json({ error: 'Database insertion failed' });
      }
      res.json({ uploadId: id, message: 'File uploaded successfully' });
    }
  );
});

module.exports = router;
