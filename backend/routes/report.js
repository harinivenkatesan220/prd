const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/:reportId', (req, res) => {
  const { reportId } = req.params;
  db.get('SELECT report_json FROM reports WHERE id=?', [reportId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Report not found' });
    res.json(JSON.parse(row.report_json));
  });
});


router.get('/share/:reportId', (req, res) => {
  const { reportId } = req.params;
  db.get('SELECT report_json FROM reports WHERE id=?', [reportId], (err, row) => {
    if (err || !row) return res.status(404).send('<h1>Report not found</h1>');
    const report = JSON.parse(row.report_json);
    res.send(`
      <html>
      <head><title>Shared Report</title></head>
      <body>
      <h1>Readiness Report: ${report.reportId}</h1>
      <pre>${JSON.stringify(report, null, 2)}</pre>
      </body>
      </html>
    `);
  });
});


router.get('/recent', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  db.all('SELECT id, created_at, report_json FROM reports ORDER BY created_at DESC LIMIT ?', [limit], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const recentReports = rows.map(row => {
      const r = JSON.parse(row.report_json);
      return { id: row.id, created_at: row.created_at, overall: r.scores.overall };
    });
    res.json(recentReports);
  });
});

module.exports = router;
