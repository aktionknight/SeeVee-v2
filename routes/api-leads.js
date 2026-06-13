const express = require('express');
const router = express.Router();
const leadService = require('../services/lead-service');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Multer for CSV upload
const upload = multer({ dest: path.join(__dirname, '..', 'data', 'uploads') });

// GET /api/leads — List all leads with optional filters
router.get('/', (req, res) => {
  try {
    const leads = leadService.getAllLeads(req.query);
    res.json({ success: true, data: leads, count: leads.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/:id — Get single lead
router.get('/:id', (req, res) => {
  try {
    const lead = leadService.getLeadById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads — Add a new lead
router.post('/', (req, res) => {
  try {
    const result = leadService.addLead(req.body);
    const lead = leadService.getLeadById(result.id);
    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/leads/import — Import from CSV
router.post('/import', upload.single('csv'), (req, res) => {
  try {
    let filePath;
    if (req.file) {
      filePath = req.file.path;
    } else {
      // Use default seed file
      filePath = path.join(__dirname, '..', 'data', 'seed-leads.csv');
    }

    if (!fs.existsSync(filePath)) {
      return res.status(400).json({ success: false, error: 'CSV file not found' });
    }

    const result = leadService.importFromCSV(filePath);

    // Clean up uploaded file
    if (req.file) fs.unlinkSync(req.file.path);

    res.json({ success: true, data: result });
  } catch (error) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/leads/all/clear — Clear all leads
router.delete('/all/clear', (req, res) => {
  try {
    leadService.clearAllLeads();
    res.json({ success: true, message: 'All leads cleared' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/leads/:id — Update a lead
router.put('/:id', (req, res) => {
  try {
    const lead = leadService.updateLead(req.params.id, req.body);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found or no changes' });
    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// DELETE /api/leads/:id — Delete a lead
router.delete('/:id', (req, res) => {
  try {
    const result = leadService.deleteLead(req.params.id);
    if (result.changes === 0) return res.status(404).json({ success: false, error: 'Lead not found' });
    res.json({ success: true, message: 'Lead deleted' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/priority/next — Get next batch of high-priority leads
router.get('/priority/next', (req, res) => {
  try {
    const limit = parseInt(req.query.limit || '10', 10);
    const leads = leadService.getLeadsByPriority(limit);
    res.json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads/enrich — Find missing emails using Apollo
const enrichmentService = require('../services/enrichment-service');
router.post('/enrich', async (req, res) => {
  try {
    const result = await enrichmentService.enrichMissingEmails();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads/simulate — Simulate missing emails
router.post('/simulate', (req, res) => {
  try {
    const result = enrichmentService.simulateMissingEmails();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
