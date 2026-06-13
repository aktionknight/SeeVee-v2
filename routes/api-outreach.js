const express = require('express');
const router = express.Router();
const outreachService = require('../services/outreach-service');
const emailService = require('../services/email-service');
const leadService = require('../services/lead-service');
const linkedinService = require('../services/linkedin-service');

// GET /api/outreach — List outreach log
router.get('/', (req, res) => {
  try {
    const log = outreachService.getOutreachLog(req.query);
    res.json({ success: true, data: log, count: log.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/outreach/:id — Get single outreach record
router.get('/:id', (req, res) => {
  try {
    const record = outreachService.getOutreachById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/outreach/send/:leadId — Send email to specific lead
router.post('/send/:leadId', async (req, res) => {
  try {
    const lead = leadService.getLeadById(req.params.leadId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });
    if (!lead.email) return res.status(400).json({ success: false, error: 'Lead has no email address' });

    const template = req.body.template || (
      lead.person_role === 'recruiter' || lead.person_role === 'hr'
        ? 'cold-email-recruiter'
        : 'cold-email-founder'
    );

    const result = await emailService.sendColdEmail(lead, template, req.body.subject);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/outreach/batch — Send batch emails
router.post('/batch', async (req, res) => {
  try {
    const count = parseInt(req.body.count || '5', 10);
    const results = await outreachService.sendBatchEmails(count);
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/outreach/:id/status — Update outreach status
router.put('/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status required' });
    const record = outreachService.updateOutreachStatus(req.params.id, status);
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/outreach/:id/notes — Add notes
router.put('/:id/notes', (req, res) => {
  try {
    const { notes } = req.body;
    const record = outreachService.updateOutreachNotes(req.params.id, notes);
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// POST /api/linkedin/generate/:leadId — Generate LinkedIn message
router.post('/linkedin/generate/:leadId', (req, res) => {
  try {
    const lead = leadService.getLeadById(req.params.leadId);
    if (!lead) return res.status(404).json({ success: false, error: 'Lead not found' });

    const template = req.body.template || 'connectionRequest';
    const message = linkedinService.generateMessage(lead, template);
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// PUT /api/linkedin/:leadId/sent — Mark LinkedIn message as sent
router.put('/linkedin/:leadId/sent', (req, res) => {
  try {
    const templateKey = req.body.template || 'connectionRequest';
    const message = req.body.message || '';
    const trackingId = linkedinService.logLinkedInOutreach(req.params.leadId, templateKey, message);
    res.json({ success: true, data: { trackingId } });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/linkedin/templates — List available templates
router.get('/linkedin/templates', (req, res) => {
  const templates = linkedinService.getAvailableTemplates();
  res.json({ success: true, data: templates });
});

// GET /api/outreach/email/stats — Get email sending stats
router.get('/email/stats', (req, res) => {
  const stats = emailService.getEmailStats();
  res.json({ success: true, data: stats });
});

module.exports = router;
