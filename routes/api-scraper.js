const express = require('express');
const router = express.Router();
const scraperService = require('../services/scraper-service');

// Start a new scrape job
router.post('/start', async (req, res) => {
  try {
    if (!scraperService.isConfigured()) {
      return res.status(400).json({ 
        success: false, 
        error: 'Apify API token is not configured. Please add APIFY_API_TOKEN to your .env file.' 
      });
    }

    const { query, maxResults } = req.body;
    const jobId = await scraperService.scrapeLeads(query, maxResults || 10);
    
    res.json({ success: true, data: { jobId } });
  } catch (error) {
    console.error('Error starting scrape:', error);
    res.status(500).json({ success: false, error: 'Failed to start scrape job: ' + error.message });
  }
});

// Get job status
router.get('/status/:jobId', (req, res) => {
  const { jobId } = req.params;
  const status = scraperService.getJobStatus(jobId);
  res.json({ success: true, data: status });
});

module.exports = router;
