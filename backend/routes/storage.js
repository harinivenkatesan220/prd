const express = require('express');
const router = express.Router();
const supabase = require('../supabaseClient');

router.get('/upload-url', async (req, res) => {
  const bucket = 'uploads';
  const fileName = `upload_${Date.now()}_${Math.random().toString(36).substring(2)}.json`;
  try {
    const { signedURL, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileName, 60); 
    if (error) throw error;
    res.json({ uploadUrl: signedURL, fileName });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
