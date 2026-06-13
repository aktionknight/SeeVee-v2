const express = require('express');
const router = express.Router();
const outreachService = require('../services/outreach-service');
const { getDb } = require('../database/init');

// GET /api/dashboard/stats — Overview statistics
router.get('/stats', (req, res) => {
  try {
    const stats = outreachService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/dashboard/activity — Recent activity feed
router.get('/activity', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '20', 10);
    const activity = outreachService.getRecentActivity(limit);
    res.json({ success: true, data: activity });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/settings — Get app settings
router.get('/settings', (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM app_settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/settings — Update app settings
router.put('/settings', (req, res) => {
  try {
    const db = getDb();
    const upsert = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
    const transaction = db.transaction((entries) => {
      for (const [key, value] of entries) {
        upsert.run(key, String(value));
      }
    });

    transaction(Object.entries(req.body));
    
    // Re-fetch settings
    const rows = db.prepare('SELECT * FROM app_settings').all();
    const settings = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }

    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
