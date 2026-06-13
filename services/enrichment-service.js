const settings = require('../config/settings');
const leadService = require('./lead-service');

class EnrichmentService {
  isConfigured() {
    return !!settings.hunterApiKey;
  }

  async enrichLeadWithEmail(lead) {
    if (!this.isConfigured()) {
      throw new Error('Hunter.io API key is not configured.');
    }

    try {
      if (!settings.hunterApiKey) {
        throw new Error('Hunter.io API key is not configured.');
      }

      const nameParts = lead.person_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      let linkedinHandle = '';
      if (lead.linkedin_url && lead.linkedin_url.includes('/in/')) {
          const parts = lead.linkedin_url.split('/in/');
          if (parts.length > 1) {
              linkedinHandle = parts[1].split('/')[0].split('?')[0];
          }
      }

      let url = `https://api.hunter.io/v2/email-finder?company=${encodeURIComponent(lead.company_name)}&first_name=${encodeURIComponent(firstName)}&last_name=${encodeURIComponent(lastName)}&api_key=${settings.hunterApiKey}`;
      
      if (linkedinHandle) {
          url += `&linkedin_handle=${encodeURIComponent(linkedinHandle)}`;
      }
      
      const response = await fetch(url, {
        method: 'GET'
      });

      const data = await response.json();
      console.log(`Hunter response for ${firstName} ${lastName} at ${lead.company_name}:`, data);

      if (response.ok && data.data && data.data.email) {
        const updatedLead = leadService.updateLead(lead.id, {
          email: data.data.email,
          email_verified: data.data.score >= 80 ? 1 : 0,
        });
        return { success: true, email: data.data.email, updatedLead };
      } else {
        const reason = data.errors ? data.errors[0].details : 'No email found.';
        return { success: false, reason: reason, data };
      }
    } catch (error) {
      console.error('Error calling Hunter API:', error);
      throw new Error('Failed to connect to enrichment service.');
    }
  }

  async enrichMissingEmails() {
    if (!this.isConfigured()) {
      throw new Error('Hunter.io API key is not configured.');
    }

    // Get all leads without an email
    // leadService.getAllLeads doesn't explicitly have a filter for "missing email"
    // So we fetch all and filter in memory (or we can add a filter to getAllLeads)
    const allLeads = leadService.getAllLeads();
    const leadsToEnrich = allLeads.filter(l => !l.email || l.email.trim() === '');

    let enrichedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const lead of leadsToEnrich) {
      try {
        const result = await this.enrichLeadWithEmail(lead);
        if (result.success) {
          enrichedCount++;
        } else {
          skippedCount++;
        }

        // Wait 500ms between calls to avoid aggressive rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        skippedCount++;
        errors.push({ leadId: lead.id, error: error.message });
      }
    }

    return {
      totalAttempted: leadsToEnrich.length,
      enrichedCount,
      skippedCount,
      errors
    };
  }

  simulateMissingEmails() {
    const allLeads = leadService.getAllLeads();
    const leadsToEnrich = allLeads.filter(l => !l.email || l.email.trim() === '');
    let simulatedCount = 0;

    for (const lead of leadsToEnrich) {
      const nameParts = lead.person_name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const simulatedEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase() || 'contact'}@${lead.company_name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'company'}.com`;
      leadService.updateLead(lead.id, {
        email: simulatedEmail,
        email_verified: 1, // Simulated
      });
      simulatedCount++;
    }

    return { success: true, simulatedCount };
  }
}

module.exports = new EnrichmentService();
