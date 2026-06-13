const express = require('express');
const router = express.Router();
const trackerService = require('../services/tracker-service');

// GET /track/open/:trackingId — Tracking pixel for email opens
router.get('/open/:trackingId', (req, res) => {
  try {
    trackerService.recordOpen(req.params.trackingId);
  } catch (e) {
    // Silent fail — don't break pixel loading
  }
  
  const pixel = trackerService.getTrackingPixel();
  res.set({
    'Content-Type': 'image/png',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  });
  res.end(pixel);
});

// GET /track/click/:trackingId — Click tracking redirect
router.get('/click/:trackingId', (req, res) => {
  try {
    trackerService.recordClick(req.params.trackingId);
  } catch (e) {
    // Silent fail
  }
  
  const url = req.query.url;
  if (url) {
    res.redirect(decodeURIComponent(url));
  } else {
    res.status(400).send('Missing URL');
  }
});

module.exports = router;
