const { ApifyClient } = require('apify-client');
const settings = require('../config/settings');
const leadService = require('./lead-service');

class ScraperService {
  constructor() {
    this.client = settings.apifyApiKey ? new ApifyClient({ token: settings.apifyApiKey }) : null;
    this.activeJobs = new Map();
  }

  isConfigured() {
    return !!this.client;
  }

  /**
   * Run a scraping job using an Apify Actor.
   * This example uses a Google Search Scraper to find LinkedIn profiles,
   * which is a safe, cookie-free way to find leads.
   */
  async scrapeLeads(query, maxResults = 10) {
    if (!this.client) {
      throw new Error('Apify API token is not configured in settings.');
    }

    const jobId = `job_${Date.now()}`;
    
    // We run it asynchronously so we can return a job ID immediately
    this._runScrapeJob(jobId, query, maxResults).catch(err => {
      console.error(`Scrape job ${jobId} failed:`, err);
      this.activeJobs.set(jobId, { status: 'failed', error: err.message });
    });

    return jobId;
  }

  async _runScrapeJob(jobId, query, maxResults) {
    this.activeJobs.set(jobId, { status: 'running', query, leadsFound: 0 });

    try {
      // Using Apify's Google Search Scraper to find LinkedIn profiles
      // Actor ID: apify/google-search-scraper
      const actorId = 'apify/google-search-scraper';
      
      const defaultQuery = 'site:linkedin.com/in/ "founder" OR "recruiter" "AI" OR "Machine Learning"';
      const searchQuery = query || defaultQuery;

      const input = {
        queries: searchQuery,
        // Scan up to 5 pages (50 results) to find 'maxResults' NEW leads, skipping duplicates
        maxPagesPerQuery: Math.max(5, Math.ceil(maxResults / 10)),
        resultsPerPage: 10,
        countryCode: 'us',
      };

      console.log(`Starting Apify scrape job ${jobId} with query: ${searchQuery}`);
      
      // Run the actor
      const run = await this.client.actor(actorId).call(input);
      console.log(`Apify run finished: ${run.id}. Fetching results...`);

      // Fetch the dataset items
      const { items } = await this.client.dataset(run.defaultDatasetId).listItems();

      let leadsAdded = 0;

      // Process and parse results
      for (const item of items) {
        if (item.organicResults && item.organicResults.length > 0) {
          for (const result of item.organicResults) {
            if (leadsAdded >= maxResults) break;

            const url = result.url || '';
            if (url.includes('linkedin.com/in/')) {
              // Parse basic info from Google result title/description
              // Format usually: "Name - Title - Company | LinkedIn"
              const titleParts = (result.title || '').split(' - ');
              const name = titleParts[0] ? titleParts[0].trim() : 'Unknown';
              
              let role = 'founder';
              if (result.title.toLowerCase().includes('recruiter') || result.description.toLowerCase().includes('recruiter')) {
                role = 'recruiter';
              } else if (result.title.toLowerCase().includes('software') || result.title.toLowerCase().includes('engineer')) {
                role = 'engineering_lead';
              }

              let domain = 'both';
              if (result.description.toLowerCase().includes('ai') || result.description.toLowerCase().includes('machine learning')) {
                domain = 'ai-ml';
              } else if (result.description.toLowerCase().includes('software')) {
                domain = 'sde';
              }

              // Extract company name heuristically
              let company = 'Unknown Company';
              if (titleParts.length > 2) {
                company = titleParts[2].split('|')[0].trim();
              } else if (titleParts.length === 2) {
                company = titleParts[1].split('|')[0].trim();
              }

              const newLead = {
                company_name: company,
                person_name: name,
                person_role: role,
                linkedin_url: url,
                company_size: 10, // Default for startups
                domain: domain,
                region: 'us', // Default from search
                source: 'apify_scrape',
                status: 'new'
              };

              try {
                // Insert into DB
                leadService.addLead(newLead);
                leadsAdded++;
              } catch (dbErr) {
                // Might fail if duplicate URL (since we added unique constraints)
                console.warn('Skipped duplicate or invalid lead:', url);
                console.error(dbErr);
              }
            }
          }
        }
      }

      this.activeJobs.set(jobId, { 
        status: 'completed', 
        leadsFound: leadsAdded,
        query: searchQuery
      });
      console.log(`Scrape job ${jobId} completed. Added ${leadsAdded} leads.`);

    } catch (error) {
      console.error(`Apify scraping error for job ${jobId}:`, error);
      this.activeJobs.set(jobId, { status: 'failed', error: error.message });
      throw error;
    }
  }

  getJobStatus(jobId) {
    return this.activeJobs.get(jobId) || { status: 'not_found' };
  }
}

module.exports = new ScraperService();
