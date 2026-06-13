const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const settings = require('../config/settings');
const { getDb } = require('../database/init');

let transporter = null;
let emailsSentToday = 0;
let lastSendTime = 0;
let lastResetDate = new Date().toDateString();

function getTransporter() {
  if (!transporter) {
    if (!settings.gmail.user || !settings.gmail.appPassword) {
      console.warn('⚠️  Gmail credentials not configured. Running in dry-run mode.');
      return null;
    }
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: settings.gmail.user,
        pass: settings.gmail.appPassword,
      },
    });
  }
  return transporter;
}

// Reset daily counter at midnight
function checkDailyReset() {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    emailsSentToday = 0;
    lastResetDate = today;
  }
}

function canSendNow() {
  checkDailyReset();

  const db = getDb();
  const dryRun = db.prepare("SELECT value FROM app_settings WHERE key = 'dry_run_mode'").get();
  if (dryRun && dryRun.value === 'true') {
    return { allowed: false, reason: 'Dry-run mode is enabled. Disable it in Settings to send real emails.' };
  }

  if (emailsSentToday >= settings.outreach.dailyLimit) {
    return { allowed: false, reason: `Daily limit reached (${settings.outreach.dailyLimit} emails)` };
  }

  const now = Date.now();
  const elapsed = now - lastSendTime;
  if (elapsed < settings.outreach.minSendIntervalMs) {
    const waitSec = Math.ceil((settings.outreach.minSendIntervalMs - elapsed) / 1000);
    return { allowed: false, reason: `Rate limit: wait ${waitSec}s before next send` };
  }

  const hour = new Date().getHours();
  if (hour < settings.outreach.sendingHoursStart || hour >= settings.outreach.sendingHoursEnd) {
    return { allowed: false, reason: `Outside sending hours (${settings.outreach.sendingHoursStart}:00 - ${settings.outreach.sendingHoursEnd}:00)` };
  }

  return { allowed: true };
}

function injectTracking(html, trackingId) {
  const baseUrl = settings.baseUrl;

  // Add open tracking pixel before </body>
  const pixel = `<img src="${baseUrl}/track/open/${trackingId}" width="1" height="1" style="display:none" alt="" />`;
  html = html.replace('</body>', `${pixel}</body>`);

  // Rewrite links for click tracking
  html = html.replace(/href="(https?:\/\/[^"]+)"/g, (match, url) => {
    const encoded = encodeURIComponent(url);
    return `href="${baseUrl}/track/click/${trackingId}?url=${encoded}"`;
  });

  return html;
}

function renderTemplate(templateHtml, variables) {
  let rendered = templateHtml;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value || '');
  }
  return rendered;
}

async function sendColdEmail(lead, templateName, customSubject) {
  const db = getDb();
  const trackingId = uuidv4();

  // Load template
  const templatePath = path.join(settings.paths.templates, `${templateName}.html`);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}`);
  }
  let templateHtml = fs.readFileSync(templatePath, 'utf8');

  // Determine subject based on template
  const subjectMap = {
    'cold-email-founder': `Passionate ${lead.domain === 'ai-ml' ? 'AI/ML' : 'SDE'} Student — Internship Inquiry at {{companyName}}`,
    'cold-email-recruiter': `Application for Remote ${lead.domain === 'ai-ml' ? 'AI/ML' : 'SDE'} Internship — {{companyName}}`,
  };

  let subject = customSubject || subjectMap[templateName] || `Internship Inquiry — {{companyName}}`;

  // Template variables
  const variables = {
    companyName: lead.company_name,
    personName: lead.person_name,
    personFirstName: lead.person_name.split(' ')[0],
    personRole: lead.person_role,
    domain: lead.domain === 'ai-ml' ? 'AI/ML' : 'Software Development',
    domainShort: lead.domain === 'ai-ml' ? 'AI/ML' : 'SDE',
    senderName: settings.sender.name,
    senderFirstName: settings.sender.name.split(' ')[0],
    senderIntro: settings.sender.intro,
    companyWebsite: lead.company_website || '',
    year: new Date().getFullYear().toString(),
  };

  // Render subject and body
  subject = renderTemplate(subject, variables);
  templateHtml = renderTemplate(templateHtml, variables);

  // Inject tracking
  templateHtml = injectTracking(templateHtml, trackingId);

  // Create outreach log entry
  const insertLog = db.prepare(`
    INSERT INTO outreach_log (lead_id, channel, status, subject, body_preview, template_used, tracking_id, sent_at)
    VALUES (?, 'email', ?, ?, ?, ?, ?, ?)
  `);

  // Check if we can send
  const check = canSendNow();

  // Check dry run mode
  const dryRun = db.prepare("SELECT value FROM app_settings WHERE key = 'dry_run_mode'").get();
  const isDryRun = dryRun && dryRun.value === 'true';

  if (isDryRun) {
    // Log as dry-run
    const bodyPreview = templateHtml.replace(/<[^>]*>/g, '').substring(0, 200);
    insertLog.run(lead.id, 'dry-run', subject, bodyPreview, templateName, trackingId, new Date().toISOString());

    // Update lead status
    db.prepare("UPDATE leads SET status = 'contacted', updated_at = datetime('now') WHERE id = ?").run(lead.id);

    return {
      success: true,
      dryRun: true,
      trackingId,
      subject,
      message: 'Email logged in dry-run mode (not actually sent)',
    };
  }

  if (!check.allowed) {
    throw new Error(check.reason);
  }

  const transport = getTransporter();
  if (!transport) {
    throw new Error('Email transporter not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }

  // Build mail options
  const mailOptions = {
    from: `"${settings.sender.name}" <${settings.gmail.user}>`,
    to: lead.email,
    subject,
    html: templateHtml,
    attachments: [],
  };

  // Attach resume if available
  if (fs.existsSync(settings.paths.resume)) {
    mailOptions.attachments.push({
      filename: `${settings.sender.name.replace(/\s+/g, '_')}_Resume.pdf`,
      path: settings.paths.resume,
    });
  }

  try {
    const info = await transport.sendMail(mailOptions);

    emailsSentToday++;
    lastSendTime = Date.now();

    const bodyPreview = templateHtml.replace(/<[^>]*>/g, '').substring(0, 200);
    insertLog.run(lead.id, 'sent', subject, bodyPreview, templateName, trackingId, new Date().toISOString());

    // Update lead status
    db.prepare("UPDATE leads SET status = 'contacted', updated_at = datetime('now') WHERE id = ?").run(lead.id);

    // Schedule first follow-up
    const followUpDate = new Date();
    followUpDate.setDate(followUpDate.getDate() + settings.outreach.followUpDay1);
    db.prepare("UPDATE outreach_log SET next_follow_up_date = ? WHERE tracking_id = ?")
      .run(followUpDate.toISOString().split('T')[0], trackingId);

    return {
      success: true,
      dryRun: false,
      trackingId,
      subject,
      messageId: info.messageId,
      emailsSentToday,
    };
  } catch (error) {
    // Log as bounced/failed
    const bodyPreview = templateHtml.replace(/<[^>]*>/g, '').substring(0, 200);
    insertLog.run(lead.id, 'bounced', subject, bodyPreview, templateName, trackingId, new Date().toISOString());
    throw error;
  }
}

async function sendTestEmail() {
  const transport = getTransporter();
  if (!transport) {
    console.log('📧 [DRY RUN] Would send test email to:', settings.gmail.user);
    return { success: true, dryRun: true };
  }

  const info = await transport.sendMail({
    from: `"${settings.sender.name}" <${settings.gmail.user}>`,
    to: settings.gmail.user,
    subject: '✅ Cold Reach Automation — Test Email',
    html: '<h2>It works!</h2><p>Your email configuration is set up correctly.</p>',
  });

  return { success: true, messageId: info.messageId };
}

function getEmailStats() {
  checkDailyReset();
  return {
    sentToday: emailsSentToday,
    dailyLimit: settings.outreach.dailyLimit,
    remaining: settings.outreach.dailyLimit - emailsSentToday,
    canSend: canSendNow(),
  };
}

module.exports = {
  sendColdEmail,
  sendTestEmail,
  canSendNow,
  getEmailStats,
  renderTemplate,
};
