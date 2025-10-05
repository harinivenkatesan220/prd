const express = require('express');
const db = require('../db');
const supabase = require('../supabaseClient');
const router = express.Router();

router.get('/health', async (req, res) => {
  try {
    await db.get('SELECT 1');

    const { data, error } = await supabase.storage.from('uploads').list('');
    if (error) throw error;
    res.json({ status: 'UP', db: 'reachable', storageItemsCount: data.length });
  } catch (e) {
    res.status(500).json({ status: 'DOWN', error: e.message });
  }
});

module.exports = router;
