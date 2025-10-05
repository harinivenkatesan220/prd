const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { parse } = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const { sendReportEmail } = require('../utils/email');
const supabase = require('../supabaseClient');

const router = express.Router();


const upload = multer({
  limits: { fileSize: (process.env.MAX_UPLOAD_SIZE_MB || 5) * 1024 * 1024 }
});


function parseData(raw) {
  if (raw.trim().startsWith('{') || raw.trim().startsWith('[')) {
    return JSON.parse(raw);
  }
  return parse(raw, { columns: true, skip_empty_lines: true });
}


router.post('/upload', upload.single('file'), (req, res) => {
  let rawData;
  if (req.file) {
    rawData = req.file.buffer.toString();
  } else if (req.body.text) {
    rawData = req.body.text;

  } else {
    return res.status(400).json({ error: 'File or text required' });
  }

  const id = 'u_' + uuidv4();
  const createdAt = new Date().toISOString();

  db.run(
    'INSERT INTO uploads(id, created_at, raw_data) VALUES(?,?,?)',
    [id, createdAt, rawData],
    err => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ uploadId: id });
    }
  );
});


router.post('/analyze', (req, res) => {
  const { uploadId, questionnaire } = req.body;
  if (!uploadId) return res.status(400).json({ error: 'uploadId required' });

  db.get('SELECT raw_data FROM uploads WHERE id=?', [uploadId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Upload not found' });

    let data;
    try {
      data = parseData(row.raw_data);
    } catch (e) {
      return res.status(400).json({ error: 'Parse error: ' + e.message });
    }

   
    const analyze = require('./analyze'); 
    let report;
    try {
      report = analyze(data, questionnaire);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }


    db.run(
      'INSERT INTO reports(id, upload_id, created_at, report_json) VALUES(?,?,?,?)',
      [report.reportId, uploadId, new Date().toISOString(), JSON.stringify(report)],
      async err2 => {
        if (err2) return res.status(500).json({ error: err2.message });
        res.json(report);
      }
    );
  });
});


router.get('/report/:reportId', (req, res) => {
  const { reportId } = req.params;
  db.get(
    'SELECT report_json FROM reports WHERE id=?',
    [reportId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Report not found' });
      res.json(JSON.parse(row.report_json));
    }
  );
});


router.get('/reports', (req, res) => {
  const limit = parseInt(req.query.limit || '10', 10);
  db.all(
    'SELECT id AS reportId, upload_id AS uploadId, created_at AS createdAt FROM reports ORDER BY created_at DESC LIMIT ?',
    [limit],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

module.exports = router;
