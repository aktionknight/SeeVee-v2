const settings = require('../config/settings');
const { getDb } = require('../database/init');
const { v4: uuidv4 } = require('uuid');

const templates = {
  connectionRequest: {
    name: 'Connection Request',
    maxLength: 300,
    template: `Hi {{personFirstName}}, I came across {{companyName}} and I'm really impressed by what you're building in the {{domain}} space. I'm a {{senderIntro}} looking for remote internship opportunities. Would love to connect!`,
  },
  introMessage: {
    name: 'Introduction Message',
    template: `Hi {{personFirstName}},

Thank you for connecting! I wanted to reach out because I'm genuinely excited about the work {{companyName}} is doing in {{domain}}.

I'm {{senderName}}, {{senderIntro}}. I'm actively looking for a remote internship where I can contribute meaningfully to a growing team.

I'd love the opportunity to bring my skills to {{companyName}}. Would you be open to a brief chat this week?

I've attached my resume for your reference. Looking forward to hearing from you!

Best regards,
{{senderFirstName}}`,
  },
  followUp: {
    name: 'Follow-up Message',
    template: `Hi {{personFirstName}},

I wanted to follow up on my earlier message about a remote internship opportunity at {{companyName}}. 

I'm very keen to contribute to your {{domain}} projects and believe my skills in {{domainSkills}} would be a great fit for a team your size.

Would you have a few minutes for a quick chat? I'm flexible with timings.

Thanks for your time!
{{senderFirstName}}`,
  },
  recruiterMessage: {
    name: 'Recruiter Outreach',
    template: `Hi {{personFirstName}},

I noticed you're the {{personRole}} at {{companyName}}, and I'm very interested in any remote {{domainShort}} internship openings on your team.

A bit about me: {{senderIntro}}

I believe I could make a solid contribution to {{companyName}}, especially given my passion for {{domain}}. I'd love to share my resume and learn more about potential opportunities.

Could we schedule a quick call?

Best,
{{senderName}}`,
  },
};

function renderTemplate(templateStr, variables) {
  let rendered = templateStr;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value || '');
  }
  return rendered;
}

function generateMessage(lead, templateKey = 'connectionRequest') {
  const template = templates[templateKey];
  if (!template) {
    throw new Error(`Unknown template: ${templateKey}. Available: ${Object.keys(templates).join(', ')}`);
  }

  const domainSkillsMap = {
    'ai-ml': 'machine learning, deep learning, and NLP',
    'sde': 'full-stack development, system design, and DSA',
    'both': 'software engineering and machine learning',
  };

  const variables = {
    companyName: lead.company_name,
    personName: lead.person_name,
    personFirstName: lead.person_name.split(' ')[0],
    personRole: lead.person_role,
    domain: lead.domain === 'ai-ml' ? 'AI/ML' : 'Software Development',
    domainShort: lead.domain === 'ai-ml' ? 'AI/ML' : 'SDE',
    domainSkills: domainSkillsMap[lead.domain] || domainSkillsMap['both'],
    senderName: settings.sender.name,
    senderFirstName: settings.sender.name.split(' ')[0],
    senderIntro: settings.sender.intro,
    companyWebsite: lead.company_website || '',
  };

  let message = renderTemplate(template.template, variables);

  // Truncate connection requests to 300 chars
  if (template.maxLength && message.length > template.maxLength) {
    message = message.substring(0, template.maxLength - 3) + '...';
  }

  return {
    templateName: template.name,
    message,
    length: message.length,
    maxLength: template.maxLength || null,
    linkedinUrl: lead.linkedin_url,
  };
}

function logLinkedInOutreach(leadId, templateKey, message) {
  const db = getDb();
  const trackingId = uuidv4();

  db.prepare(`
    INSERT INTO outreach_log (lead_id, channel, status, subject, body_preview, template_used, tracking_id, sent_at)
    VALUES (?, 'linkedin', 'sent', ?, ?, ?, ?, datetime('now'))
  `).run(
    leadId,
    `LinkedIn: ${templateKey}`,
    message.substring(0, 200),
    templateKey,
    trackingId
  );

  // Update lead status
  db.prepare("UPDATE leads SET status = 'contacted', updated_at = datetime('now') WHERE id = ? AND status = 'new'")
    .run(leadId);

  return trackingId;
}

function getAvailableTemplates() {
  return Object.entries(templates).map(([key, t]) => ({
    key,
    name: t.name,
    maxLength: t.maxLength || null,
  }));
}

module.exports = {
  generateMessage,
  logLinkedInOutreach,
  getAvailableTemplates,
};
