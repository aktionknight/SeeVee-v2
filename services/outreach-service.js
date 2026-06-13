const cron = require('node-cron');
const { getDb } = require('../database/init');
const emailService = require('./email-service');
const leadService = require('./lead-service');
const settings = require('../config/settings');

let schedulerTask = null;
let followUpTask = null;

function getOutreachLog(filters = {}) {
  const db = getDb();
  let query = `
    SELECT o.*, l.company_name, l.person_name, l.person_role, l.domain, l.region
    FROM outreach_log o
    JOIN leads l ON o.lead_id = l.id
    WHERE 1=1
  `;
  const params = [];

  if (filters.channel) {
    query += ' AND o.channel = ?';
    params.push(filters.channel);
  }
  if (filters.status) {
    query += ' AND o.status = ?';
    params.push(filters.status);
  }
  if (filters.leadId) {
    query += ' AND o.lead_id = ?';
    params.push(parseInt(filters.leadId, 10));
  }

  query += ' ORDER BY o.created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(parseInt(filters.limit, 10));
  }

  return db.prepare(query).all(...params);
}

function getOutreachById(id) {
  const db = getDb();
  return db.prepare(`
    SELECT o.*, l.company_name, l.person_name, l.person_role
    FROM outreach_log o
    JOIN leads l ON o.lead_id = l.id
    WHERE o.id = ?
  `).get(id);
}

function updateOutreachStatus(id, status) {
  const db = getDb();
  const validStatuses = ['pending', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'no-response', 'interview'];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status: ${status}. Valid: ${validStatuses.join(', ')}`);
  }

  const outreach = db.prepare('SELECT * FROM outreach_log WHERE id = ?').get(id);
  if (!outreach) throw new Error('Outreach record not found');

  const updates = { status };
  if (status === 'replied') updates.replied_at = new Date().toISOString();

  const fields = Object.entries(updates).map(([k]) => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(id);

  db.prepare(`UPDATE outreach_log SET ${fields} WHERE id = ?`).run(...values);

  // Update lead status for important status changes
  const leadStatusMap = {
    'replied': 'replied',
    'interview': 'interview',
  };
  if (leadStatusMap[status]) {
    db.prepare("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(leadStatusMap[status], outreach.lead_id);
  }

  return getOutreachById(id);
}

function updateOutreachNotes(id, notes) {
  const db = getDb();
  db.prepare('UPDATE outreach_log SET notes = ? WHERE id = ?').run(notes, id);
  return getOutreachById(id);
}

async function sendBatchEmails(count = 5) {
  const leads = leadService.getLeadsByPriority(count);
  const results = [];

  for (const lead of leads) {
    try {
      const template = lead.person_role === 'recruiter' || lead.person_role === 'hr'
        ? 'cold-email-recruiter'
        : 'cold-email-founder';

      const result = await emailService.sendColdEmail(lead, template);
      results.push({ leadId: lead.id, company: lead.company_name, ...result });

      // Wait between sends
      if (leads.indexOf(lead) < leads.length - 1) {
        await new Promise(resolve => setTimeout(resolve, settings.outreach.minSendIntervalMs));
      }
    } catch (error) {
      results.push({
        leadId: lead.id,
        company: lead.company_name,
        success: false,
        error: error.message,
      });
    }
  }

  return results;
}

async function processFollowUps() {
  const db = getDb();
  const today = new Date().toISOString().split('T')[0];

  const dueFollowUps = db.prepare(`
    SELECT o.*, l.* FROM outreach_log o
    JOIN leads l ON o.lead_id = l.id
    WHERE o.next_follow_up_date <= ?
    AND o.status IN ('sent', 'opened', 'clicked')
    AND o.follow_up_count < 2
    AND o.channel = 'email'
  `).all(today);

  const results = [];
  for (const record of dueFollowUps) {
    try {
      const template = record.person_role === 'recruiter' || record.person_role === 'hr'
        ? 'cold-email-recruiter'
        : 'cold-email-founder';

      const result = await emailService.sendColdEmail(record, template,
        `Re: ${record.subject}`);

      // Update follow-up count and next date
      const nextFollowUpDays = record.follow_up_count === 0
        ? settings.outreach.followUpDay2
        : null;

      const nextDate = nextFollowUpDays
        ? new Date(Date.now() + nextFollowUpDays * 86400000).toISOString().split('T')[0]
        : null;

      db.prepare(`
        UPDATE outreach_log SET follow_up_count = follow_up_count + 1, next_follow_up_date = ?
        WHERE id = ?
      `).run(nextDate, record.id);

      results.push({ leadId: record.lead_id, ...result });
    } catch (error) {
      results.push({ leadId: record.lead_id, error: error.message });
    }
  }

  return results;
}

function getDashboardStats() {
  const db = getDb();

  const totalLeads = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const totalSent = db.prepare("SELECT COUNT(*) as count FROM outreach_log WHERE status != 'pending' AND status != 'dry-run'").get().count;
  const totalDryRun = db.prepare("SELECT COUNT(*) as count FROM outreach_log WHERE status = 'dry-run'").get().count;
  const totalOpened = db.prepare("SELECT COUNT(*) as count FROM outreach_log WHERE opened_at IS NOT NULL").get().count;
  const totalClicked = db.prepare("SELECT COUNT(*) as count FROM outreach_log WHERE clicked_at IS NOT NULL").get().count;
  const totalReplied = db.prepare("SELECT COUNT(*) as count FROM outreach_log WHERE status = 'replied'").get().count;
  const totalInterview = db.prepare("SELECT COUNT(*) as count FROM outreach_log WHERE status = 'interview'").get().count;
  const totalBounced = db.prepare("SELECT COUNT(*) as count FROM outreach_log WHERE status = 'bounced'").get().count;

  const pendingFollowUps = db.prepare(`
    SELECT COUNT(*) as count FROM outreach_log
    WHERE next_follow_up_date <= date('now')
    AND status IN ('sent', 'opened', 'clicked')
    AND follow_up_count < 2
  `).get().count;

  const emailStats = emailService.getEmailStats();

  // Pipeline counts
  const pipeline = {
    new: db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'new'").get().count,
    contacted: db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'contacted'").get().count,
    opened: db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'opened'").get().count,
    replied: db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'replied'").get().count,
    interview: db.prepare("SELECT COUNT(*) as count FROM leads WHERE status = 'interview'").get().count,
  };

  // Daily send counts (last 14 days)
  const dailySends = db.prepare(`
    SELECT date(sent_at) as day, COUNT(*) as count
    FROM outreach_log
    WHERE sent_at IS NOT NULL AND sent_at >= date('now', '-14 days')
    GROUP BY date(sent_at)
    ORDER BY day
  `).all();

  // Domain breakdown
  const domainBreakdown = db.prepare('SELECT domain, COUNT(*) as count FROM leads GROUP BY domain').all();
  
  // Region breakdown
  const regionBreakdown = db.prepare('SELECT region, COUNT(*) as count FROM leads GROUP BY region').all();

  return {
    totalLeads,
    totalSent: totalSent + totalDryRun,
    totalOpened,
    totalClicked,
    totalReplied,
    totalInterview,
    totalBounced,
    pendingFollowUps,
    openRate: totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : '0.0',
    replyRate: totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0.0',
    emailStats,
    pipeline,
    dailySends,
    domainBreakdown,
    regionBreakdown,
  };
}

function getRecentActivity(limit = 20) {
  const db = getDb();
  return db.prepare(`
    SELECT o.id, o.channel, o.status, o.subject, o.sent_at, o.opened_at, o.clicked_at, o.replied_at,
           o.created_at, o.follow_up_count, o.notes,
           l.company_name, l.person_name, l.person_role, l.domain
    FROM outreach_log o
    JOIN leads l ON o.lead_id = l.id
    ORDER BY o.created_at DESC
    LIMIT ?
  `).all(limit);
}

function startScheduler() {
  // Auto-send batch every 2 hours during sending hours (disabled by default)
  schedulerTask = cron.schedule('0 */2 9-17 * * *', async () => {
    const db = getDb();
    const autoSend = db.prepare("SELECT value FROM app_settings WHERE key = 'auto_send_enabled'").get();
    if (autoSend && autoSend.value === 'true') {
      console.log('🤖 Auto-send triggered...');
      try {
        const results = await sendBatchEmails(3);
        console.log(`📧 Batch result: ${results.length} processed`);
      } catch (error) {
        console.error('❌ Auto-send error:', error.message);
      }
    }
  });

  // Process follow-ups daily at 10 AM
  followUpTask = cron.schedule('0 10 * * *', async () => {
    const db = getDb();
    const followUpEnabled = db.prepare("SELECT value FROM app_settings WHERE key = 'follow_up_enabled'").get();
    if (followUpEnabled && followUpEnabled.value === 'true') {
      console.log('🔄 Processing follow-ups...');
      try {
        const results = await processFollowUps();
        console.log(`📧 Follow-ups: ${results.length} processed`);
      } catch (error) {
        console.error('❌ Follow-up error:', error.message);
      }
    }
  });

  console.log('⏰ Scheduler started');
}

function stopScheduler() {
  if (schedulerTask) schedulerTask.stop();
  if (followUpTask) followUpTask.stop();
}

module.exports = {
  getOutreachLog,
  getOutreachById,
  updateOutreachStatus,
  updateOutreachNotes,
  sendBatchEmails,
  processFollowUps,
  getDashboardStats,
  getRecentActivity,
  startScheduler,
  stopScheduler,
};
