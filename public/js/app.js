/* ═══════════════════════════════════════════════════════════
   Cold Reach Automation — Dashboard App
   ═══════════════════════════════════════════════════════════ */

let currentPage = 'dashboard';
let cachedStats = null;
let cachedLeads = [];
let currentLinkedInMsg = null;

// ── Navigation ──
function navigate(page) {
  currentPage = page;

  // Update nav items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });

  // Update page sections
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.toggle('active', section.id === `page-${page}`);
  });

  // Load page data
  switch (page) {
    case 'dashboard': loadDashboard(); break;
    case 'pipeline': loadPipeline(); break;
    case 'leads': loadLeads(); break;
    case 'compose': loadComposeSelects(); break;
    case 'activity': loadActivity(); break;
    case 'analytics': loadAnalytics(); break;
    case 'settings': loadSettings(); break;
  }

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('open');
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── Toast Notifications ──
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  toast.innerHTML = `<span>${icons[type] || 'ℹ️'}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// ── Modal Helpers ──
function openModal(id) {
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// ── Formatting Helpers ──
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
  const clean = (status || 'unknown').replace(/[^a-z0-9-]/g, '');
  const labels = {
    'new': '🆕 New', 'contacted': '📨 Contacted', 'opened': '👀 Opened',
    'clicked': '🔗 Clicked', 'replied': '💬 Replied', 'interview': '🎯 Interview',
    'bounced': '❌ Bounced', 'sent': '📨 Sent', 'dry-run': '🧪 Dry Run',
    'pending': '⏳ Pending', 'no-response': '😶 No Response',
  };
  return `<span class="badge badge-${clean}">${labels[clean] || clean}</span>`;
}

function domainBadge(domain) {
  const labels = { 'ai-ml': '🤖 AI/ML', 'sde': '💻 SDE', 'both': '🔀 Both' };
  return `<span class="badge badge-${domain}">${labels[domain] || domain}</span>`;
}

function regionBadge(region) {
  const labels = { 'us': '🇺🇸 US', 'india': '🇮🇳 India' };
  return `<span class="badge badge-${region}">${labels[region] || region}</span>`;
}

function priorityBar(score) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? 'var(--accent-success)' : score >= 5 ? 'var(--accent-warning)' : 'var(--accent-danger)';
  return `
    <div style="display:flex;align-items:center;gap:8px">
      <span class="text-mono" style="font-size:12px;color:${color}">${score}</span>
      <div style="flex:1;height:4px;background:rgba(255,255,255,0.05);border-radius:2px;width:60px">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:2px"></div>
      </div>
    </div>`;
}

// ══════════════════════════════
// ── Dashboard Page ──
// ══════════════════════════════
async function loadDashboard() {
  try {
    const [statsRes, activityRes] = await Promise.all([
      api.dashboard.stats(),
      api.dashboard.activity(10),
    ]);
    cachedStats = statsRes.data;
    const stats = statsRes.data;

    // Update stat cards
    document.getElementById('statTotalLeads').textContent = stats.totalLeads;
    document.getElementById('statTotalSent').textContent = stats.totalSent;
    document.getElementById('statOpenRate').textContent = stats.openRate + '%';
    document.getElementById('statReplyRate').textContent = stats.replyRate + '%';
    document.getElementById('statInterviews').textContent = stats.totalInterview;
    document.getElementById('statFollowUps').textContent = stats.pendingFollowUps;

    // Update sidebar badges
    document.getElementById('leadsBadge').textContent = stats.totalLeads;
    document.getElementById('pipelineBadge').textContent = stats.totalSent;

    // Render charts
    charts.renderFunnelChart('funnelChart', stats);
    if (stats.domainBreakdown.length > 0) {
      charts.renderDomainChart('domainChart', stats.domainBreakdown);
    }
    if (stats.regionBreakdown.length > 0) {
      charts.renderRegionChart('regionChart', stats.regionBreakdown);
    }

    // Render activity feed
    renderActivityFeed('dashboardActivityFeed', activityRes.data);
  } catch (error) {
    showToast('Failed to load dashboard: ' + error.message, 'error');
  }
}

// ══════════════════════════════
// ── Activity Feed Renderer ──
// ══════════════════════════════
function renderActivityFeed(containerId, activities) {
  const container = document.getElementById(containerId);
  if (!activities || activities.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">📭</div>
        <h3>No activity yet</h3>
        <p>Import leads and start your outreach to see activity here.</p>
      </div>`;
    return;
  }

  container.innerHTML = activities.map(a => {
    const actionTexts = {
      'sent': `Email sent to <strong>${a.person_name}</strong> at ${a.company_name}`,
      'dry-run': `[Dry Run] Email logged for <strong>${a.person_name}</strong> at ${a.company_name}`,
      'opened': `<strong>${a.person_name}</strong> opened your email (${a.company_name})`,
      'clicked': `<strong>${a.person_name}</strong> clicked a link (${a.company_name})`,
      'replied': `🎉 <strong>${a.person_name}</strong> replied! (${a.company_name})`,
      'interview': `🎯 Interview scheduled with <strong>${a.person_name}</strong> at ${a.company_name}`,
      'bounced': `❌ Email bounced for ${a.company_name}`,
    };
    const text = actionTexts[a.status] || `${a.status} — ${a.company_name}`;
    const time = formatDate(a.sent_at || a.created_at);
    const channelIcon = a.channel === 'linkedin' ? '💼' : '📧';

    return `
      <div class="activity-item">
        <div class="activity-dot ${a.status}"></div>
        <div class="activity-content">
          <div class="activity-title">${channelIcon} ${text}</div>
          <div class="activity-meta">${time}${a.subject ? ' · ' + a.subject : ''}${a.notes ? ' · 📝 ' + a.notes : ''}</div>
        </div>
        <button class="btn btn-ghost btn-sm btn-icon" onclick="openStatusModal(${a.id})" title="Update Status">✏️</button>
      </div>`;
  }).join('');
}

// ══════════════════════════════
// ── Pipeline Page ──
// ══════════════════════════════
async function loadPipeline() {
  try {
    const [statsRes, outreachRes] = await Promise.all([
      api.dashboard.stats(),
      api.outreach.getAll(),
    ]);
    const stats = statsRes.data;
    const pipeline = stats.pipeline;
    const total = Math.max(stats.totalLeads, 1);

    // Update counters
    document.getElementById('pipelineNew').textContent = pipeline.new;
    document.getElementById('pipelineContacted').textContent = pipeline.contacted;
    document.getElementById('pipelineOpened').textContent = pipeline.opened;
    document.getElementById('pipelineReplied').textContent = pipeline.replied;
    document.getElementById('pipelineInterview').textContent = pipeline.interview;

    // Update bars
    document.getElementById('pipelineNewBar').style.width = `${(pipeline.new / total) * 100}%`;
    document.getElementById('pipelineContactedBar').style.width = `${(pipeline.contacted / total) * 100}%`;
    document.getElementById('pipelineOpenedBar').style.width = `${(pipeline.opened / total) * 100}%`;
    document.getElementById('pipelineRepliedBar').style.width = `${(pipeline.replied / total) * 100}%`;
    document.getElementById('pipelineInterviewBar').style.width = `${(pipeline.interview / total) * 100}%`;

    // Render outreach table
    renderOutreachTable(outreachRes.data);
  } catch (error) {
    showToast('Failed to load pipeline: ' + error.message, 'error');
  }
}

function renderOutreachTable(records) {
  const tbody = document.getElementById('outreachTableBody');
  if (!records || records.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-muted)">No outreach records yet</td></tr>';
    return;
  }

  tbody.innerHTML = records.map(r => `
    <tr>
      <td><strong>${r.company_name}</strong></td>
      <td>${r.person_name} <span class="text-muted" style="font-size:11px">(${r.person_role})</span></td>
      <td><span class="badge badge-${r.channel}">${r.channel === 'email' ? '📧' : '💼'} ${r.channel}</span></td>
      <td>${statusBadge(r.status)}</td>
      <td class="text-muted" style="font-size:12px">${formatDate(r.sent_at)}</td>
      <td class="text-mono" style="font-size:12px">${r.follow_up_count || 0}</td>
      <td>
        <div class="flex gap-1">
          <button class="btn btn-ghost btn-sm btn-icon" onclick="openStatusModal(${r.id})" title="Update">✏️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ══════════════════════════════
// ── Leads Page ──
// ══════════════════════════════
async function loadLeads() {
  try {
    const filters = {};
    const search = document.getElementById('leadSearch')?.value;
    const domain = document.getElementById('filterDomain')?.value;
    const region = document.getElementById('filterRegion')?.value;
    const status = document.getElementById('filterStatus')?.value;

    if (search) filters.search = search;
    if (domain) filters.domain = domain;
    if (region) filters.region = region;
    if (status) filters.status = status;

    const res = await api.leads.getAll(filters);
    cachedLeads = res.data;
    renderLeadsTable(res.data);
  } catch (error) {
    showToast('Failed to load leads: ' + error.message, 'error');
  }
}

function filterLeads() {
  loadLeads();
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leadsTableBody');
  if (!leads || leads.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state">
      <div class="icon">👥</div>
      <h3>No leads found</h3>
      <p>Try adjusting your filters or import the seed CSV.</p>
      <button class="btn btn-primary mt-2" onclick="importSeedLeads()">📥 Import Seed Leads</button>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = leads.map(l => `
    <tr>
      <td>
        <strong>${l.company_name}</strong>
        ${l.company_website ? `<br><a href="${l.company_website}" target="_blank" style="font-size:11px;color:var(--accent-cyan);text-decoration:none">${l.company_website.replace('https://', '')}</a>` : ''}
      </td>
      <td>${l.person_name}</td>
      <td style="font-size:12px;text-transform:capitalize">${l.person_role}</td>
      <td style="max-width:200px;font-size:12px">
        <div class="email-cell" id="email-cell-${l.id}" onclick="startEditEmail(${l.id}, '${(l.email || '').replace(/'/g, "\\'")}')">
          ${l.email
      ? `<span class="email-display" style="cursor:pointer;color:var(--accent-cyan)" title="Click to edit">${l.email}</span>`
      : `<span class="email-display" style="cursor:pointer;color:var(--text-muted);font-style:italic" title="Click to add email">+ Add email</span>`
    }
        </div>
      </td>
      <td class="text-mono" style="font-size:12px">${l.company_size || '—'}</td>
      <td>${domainBadge(l.domain)}</td>
      <td>${regionBadge(l.region)}</td>
      <td>${priorityBar(l.priority_score)}</td>
      <td>${statusBadge(l.status)}</td>
      <td>
        <div class="flex gap-1">
          ${l.email ? `<button class="btn btn-ghost btn-sm btn-icon" onclick="quickSendEmail(${l.id})" title="Send Email">📧</button>` : ''}
          ${l.linkedin_url ? `<a class="btn btn-ghost btn-sm btn-icon" href="${l.linkedin_url}" target="_blank" title="LinkedIn">💼</a>` : ''}
          <button class="btn btn-danger btn-sm btn-icon" onclick="deleteLead(${l.id})" title="Delete">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function startEditEmail(leadId, currentEmail) {
  const cell = document.getElementById(`email-cell-${leadId}`);
  if (cell.querySelector('input')) return; // Already editing

  cell.innerHTML = `
    <div style="display:flex;align-items:center;gap:4px">
      <input type="email" id="email-input-${leadId}" value="${currentEmail}"
        placeholder="Enter email..."
        style="flex:1;padding:4px 8px;font-size:12px;border:1px solid var(--accent-cyan);border-radius:6px;background:var(--bg-card);color:var(--text-primary);outline:none;min-width:140px"
        onkeydown="if(event.key==='Enter')saveEmail(${leadId});if(event.key==='Escape')loadLeads();"
      />
      <button class="btn btn-ghost btn-sm btn-icon" onclick="saveEmail(${leadId})" title="Save" style="padding:2px 6px;font-size:14px">✓</button>
      <button class="btn btn-ghost btn-sm btn-icon" onclick="loadLeads()" title="Cancel" style="padding:2px 6px;font-size:14px">✕</button>
    </div>
  `;
  const input = document.getElementById(`email-input-${leadId}`);
  input.focus();
  input.select();
}

async function saveEmail(leadId) {
  const input = document.getElementById(`email-input-${leadId}`);
  const email = input.value.trim();

  try {
    await api.leads.update(leadId, { email });
    showToast(email ? `Email saved: ${email}` : 'Email cleared', 'success');
    loadLeads();
  } catch (error) {
    showToast('Failed to save email: ' + error.message, 'error');
  }
}

async function importSeedLeads() {
  try {
    showToast('Importing seed leads...', 'info');
    const res = await api.leads.importCSV();
    showToast(`Imported ${res.data.imported} leads (${res.data.skipped} skipped)`, 'success');
    loadLeads();
    loadDashboard();
  } catch (error) {
    showToast('Import failed: ' + error.message, 'error');
  }
}

async function enrichEmails() {
  const btn = document.getElementById('enrichBtn');
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Enriching...';

  try {
    showToast('Enriching leads using Hunteri.io...', 'info');
    const res = await api.leads.enrich();
    const data = res.data;
    showToast(`Enrichment complete! Found ${data.enrichedCount} emails, skipped/failed ${data.skippedCount}.`, 'success');
    loadLeads();
  } catch (error) {
    showToast('Enrichment failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function simulateEmails() {
  const btn = document.getElementById('simulateBtn');
  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Simulating...';

  try {
    showToast('Simulating emails for empty leads...', 'info');
    const res = await api.leads.simulate();
    showToast(`Successfully simulated ${res.data.simulatedCount} emails.`, 'success');
    loadLeads();
  } catch (error) {
    showToast('Simulation failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function clearLeads() {
  if (!confirm('Are you sure you want to clear ALL leads and outreach history? This cannot be undone.')) {
    return;
  }

  try {
    showToast('Clearing leads...', 'info');
    await api.leads.clearAll();
    showToast('All leads cleared.', 'success');
    loadLeads();
    loadDashboard();
  } catch (error) {
    showToast('Failed to clear leads: ' + error.message, 'error');
  }
}

function openAddLeadModal() {
  // Clear form
  ['newLeadCompany', 'newLeadPerson', 'newLeadEmail', 'newLeadLinkedin', 'newLeadWebsite', 'newLeadSize']
    .forEach(id => document.getElementById(id).value = '');
  openModal('addLeadModal');
}

async function addNewLead() {
  const data = {
    company_name: document.getElementById('newLeadCompany').value,
    person_name: document.getElementById('newLeadPerson').value,
    person_role: document.getElementById('newLeadRole').value,
    email: document.getElementById('newLeadEmail').value,
    linkedin_url: document.getElementById('newLeadLinkedin').value,
    company_website: document.getElementById('newLeadWebsite').value,
    company_size: parseInt(document.getElementById('newLeadSize').value) || 0,
    domain: document.getElementById('newLeadDomain').value,
    region: document.getElementById('newLeadRegion').value,
  };

  if (!data.company_name || !data.person_name) {
    showToast('Company name and contact name are required', 'error');
    return;
  }

  try {
    await api.leads.create(data);
    showToast('Lead added successfully!', 'success');
    closeModal('addLeadModal');
    loadLeads();
  } catch (error) {
    showToast('Failed to add lead: ' + error.message, 'error');
  }
}

async function deleteLead(id) {
  if (!confirm('Are you sure you want to delete this lead?')) return;
  try {
    await api.leads.delete(id);
    showToast('Lead deleted', 'success');
    loadLeads();
  } catch (error) {
    showToast('Failed to delete: ' + error.message, 'error');
  }
}

async function quickSendEmail(leadId) {
  try {
    showToast('Sending email...', 'info');
    const res = await api.outreach.send(leadId);
    if (res.data.dryRun) {
      showToast('Email logged in dry-run mode (not actually sent)', 'info');
    } else {
      showToast('Email sent successfully!', 'success');
    }
    loadLeads();
  } catch (error) {
    showToast('Send failed: ' + error.message, 'error');
  }
}

// ══════════════════════════════
// ── Compose Page ──
// ══════════════════════════════
async function loadComposeSelects() {
  try {
    const res = await api.leads.getAll();
    const leads = res.data;
    const emailOpts = leads
      .filter(l => l.email)
      .map(l => `<option value="${l.id}">${l.company_name} — ${l.person_name} (${l.email})</option>`)
      .join('');
    const allOpts = leads
      .map(l => `<option value="${l.id}">${l.company_name} — ${l.person_name}${l.linkedin_url ? ' 💼' : ''}</option>`)
      .join('');

    document.getElementById('composeEmailLead').innerHTML = '<option value="">Choose a lead...</option>' + emailOpts;
    document.getElementById('composeLinkedinLead').innerHTML = '<option value="">Choose a lead...</option>' + allOpts;
  } catch (error) {
    showToast('Failed to load leads for compose', 'error');
  }
}

async function sendComposeEmail() {
  const leadId = document.getElementById('composeEmailLead').value;
  if (!leadId) {
    showToast('Please select a lead', 'error');
    return;
  }

  const btn = document.getElementById('sendEmailBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Sending...';

  try {
    const data = {
      template: document.getElementById('composeEmailTemplate').value,
      subject: document.getElementById('composeEmailSubject').value || undefined,
    };
    const res = await api.outreach.send(leadId, data);

    const result = document.getElementById('composeEmailResult');
    if (res.data.dryRun) {
      result.innerHTML = `<div class="badge badge-dry-run">🧪 Logged in dry-run mode</div>`;
      showToast('Email logged in dry-run mode', 'info');
    } else {
      result.innerHTML = `<div class="badge badge-sent">✅ Email sent! Tracking ID: ${res.data.trackingId.substring(0, 8)}...</div>`;
      showToast('Email sent successfully!', 'success');
    }
  } catch (error) {
    showToast('Send failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📧 Send Email';
  }
}

async function generateLinkedInMsg() {
  const leadId = document.getElementById('composeLinkedinLead').value;
  if (!leadId) {
    showToast('Please select a lead', 'error');
    return;
  }

  try {
    const template = document.getElementById('composeLinkedinTemplate').value;
    const res = await api.linkedin.generate(leadId, template);
    currentLinkedInMsg = res.data;

    const preview = document.getElementById('linkedinPreview');
    preview.classList.remove('hidden');
    document.getElementById('linkedinMsgContent').textContent = res.data.message;
    document.getElementById('linkedinCharCount').textContent =
      `${res.data.length} chars${res.data.maxLength ? ` / ${res.data.maxLength} max` : ''}`;

    const actions = document.getElementById('linkedinActions');
    actions.style.display = 'flex';

    const profileLink = document.getElementById('linkedinProfileLink');
    if (res.data.linkedinUrl) {
      profileLink.href = res.data.linkedinUrl;
      profileLink.style.display = '';
    } else {
      profileLink.style.display = 'none';
    }
  } catch (error) {
    showToast('Failed to generate message: ' + error.message, 'error');
  }
}

function copyLinkedInMsg() {
  if (!currentLinkedInMsg) return;
  navigator.clipboard.writeText(currentLinkedInMsg.message)
    .then(() => showToast('Message copied to clipboard!', 'success'))
    .catch(() => showToast('Failed to copy', 'error'));
}

async function markLinkedInSent() {
  const leadId = document.getElementById('composeLinkedinLead').value;
  if (!leadId || !currentLinkedInMsg) return;

  try {
    const template = document.getElementById('composeLinkedinTemplate').value;
    await api.linkedin.markSent(leadId, template, currentLinkedInMsg.message);
    showToast('LinkedIn outreach logged!', 'success');
  } catch (error) {
    showToast('Failed to log: ' + error.message, 'error');
  }
}

// ══════════════════════════════
// ── Activity Page ──
// ══════════════════════════════
async function loadActivity() {
  try {
    const filters = {};
    const channel = document.getElementById('activityChannel')?.value;
    const status = document.getElementById('activityStatus')?.value;
    if (channel) filters.channel = channel;
    if (status) filters.status = status;
    filters.limit = 100;

    const res = await api.outreach.getAll(filters);
    renderActivityFeed('fullActivityFeed', res.data);
  } catch (error) {
    showToast('Failed to load activity', 'error');
  }
}

// ══════════════════════════════
// ── Analytics Page ──
// ══════════════════════════════
async function loadAnalytics() {
  try {
    const res = await api.dashboard.stats();
    const stats = res.data;

    charts.renderDailySendsChart('dailySendsChart', stats.dailySends);
    charts.renderFunnelChart('analyticsFunnelChart', stats);
    if (stats.domainBreakdown.length > 0) {
      charts.renderDomainChart('analyticsDomainChart', stats.domainBreakdown);
    }
    if (stats.regionBreakdown.length > 0) {
      charts.renderRegionChart('analyticsRegionChart', stats.regionBreakdown);
    }
  } catch (error) {
    showToast('Failed to load analytics', 'error');
  }
}

// ══════════════════════════════
// ── Settings Page ──
// ══════════════════════════════
async function loadSettings() {
  try {
    const [settingsRes, statsRes] = await Promise.all([
      api.settings.get(),
      api.dashboard.stats(),
    ]);
    const s = settingsRes.data;
    const stats = statsRes.data;

    // Update toggles
    setToggle('toggleDryRun', s.dry_run_mode === 'true');
    setToggle('toggleAutoSend', s.auto_send_enabled === 'true');
    setToggle('toggleFollowUp', s.follow_up_enabled === 'true');

    // Update dry run badge in sidebar
    const dryBadge = document.getElementById('dryRunBadge');
    if (s.dry_run_mode === 'true') {
      dryBadge.style.display = 'flex';
    } else {
      dryBadge.style.display = 'none';
    }

    // Email stats
    const emailStats = stats.emailStats;
    document.getElementById('settingsEmailCount').textContent =
      `${emailStats.sentToday} / ${emailStats.dailyLimit}`;

    const statusEl = document.getElementById('settingsSendStatus');
    if (emailStats.canSend.allowed) {
      statusEl.textContent = '✅ Ready to send';
      statusEl.style.color = 'var(--accent-success)';
    } else {
      statusEl.textContent = emailStats.canSend.reason;
      statusEl.style.color = 'var(--accent-warning)';
    }
  } catch (error) {
    showToast('Failed to load settings', 'error');
  }
}

function setToggle(id, active) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('active', active);
}

async function toggleSetting(key, btn) {
  const isActive = btn.classList.contains('active');
  const newValue = isActive ? 'false' : 'true';

  try {
    await api.settings.update({ [key]: newValue });
    btn.classList.toggle('active');
    showToast(`${key.replace(/_/g, ' ')} ${newValue === 'true' ? 'enabled' : 'disabled'}`, 'success');

    // Update dry run badge
    if (key === 'dry_run_mode') {
      const dryBadge = document.getElementById('dryRunBadge');
      dryBadge.style.display = newValue === 'true' ? 'flex' : 'none';
    }
  } catch (error) {
    showToast('Failed to update setting', 'error');
  }
}

async function testEmail() {
  try {
    showToast('Sending test email...', 'info');
    // We'll call the send endpoint with our own lead (create a temp one)
    showToast('Configure GMAIL_USER and GMAIL_APP_PASSWORD in .env, then restart the server', 'info');
  } catch (error) {
    showToast('Test failed: ' + error.message, 'error');
  }
}

// ══════════════════════════════
// ── Batch Send ──
// ══════════════════════════════
function openBatchSendModal() {
  document.getElementById('batchResult').innerHTML = '';
  openModal('batchSendModal');
}

async function sendBatch() {
  const count = parseInt(document.getElementById('batchCount').value) || 5;
  const btn = document.getElementById('batchSendBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Sending...';

  try {
    const res = await api.outreach.sendBatch(count);
    const results = res.data;

    const resultHtml = results.map(r => {
      if (r.success) {
        const mode = r.dryRun ? '🧪 Dry Run' : '✅ Sent';
        return `<div class="activity-item"><div class="activity-dot ${r.dryRun ? 'dry-run' : 'sent'}"></div><div class="activity-content"><div class="activity-title">${mode} — ${r.company}</div></div></div>`;
      } else {
        return `<div class="activity-item"><div class="activity-dot bounced"></div><div class="activity-content"><div class="activity-title">❌ ${r.company}: ${r.error}</div></div></div>`;
      }
    }).join('');

    document.getElementById('batchResult').innerHTML = resultHtml || '<p class="text-muted">No leads available to send</p>';
    showToast(`Batch complete: ${results.length} processed`, 'success');
    loadPipeline();
  } catch (error) {
    showToast('Batch send failed: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Send Batch';
  }
}

// ══════════════════════════════
// ── Status Update Modal ──
// ══════════════════════════════
function openStatusModal(outreachId) {
  document.getElementById('statusOutreachId').value = outreachId;
  document.getElementById('statusNotes').value = '';
  openModal('statusModal');
}

async function submitStatusUpdate() {
  const id = document.getElementById('statusOutreachId').value;
  const status = document.getElementById('statusSelect').value;
  const notes = document.getElementById('statusNotes').value;

  try {
    await api.outreach.updateStatus(id, status);
    if (notes) {
      await api.outreach.updateNotes(id, notes);
    }
    showToast('Status updated!', 'success');
    closeModal('statusModal');

    // Refresh current page
    navigate(currentPage);
  } catch (error) {
    showToast('Update failed: ' + error.message, 'error');
  }
}

// ══════════════════════════════
// ── Auto Scrape Modal ──
// ══════════════════════════════
function openScrapeModal() {
  document.getElementById('scrapeResult').innerHTML = '';
  openModal('scrapeModal');
}

async function startScrape() {
  const query = document.getElementById('scrapeQuery').value;
  const maxResults = parseInt(document.getElementById('scrapeMaxResults').value) || 10;
  const btn = document.getElementById('scrapeBtn');

  btn.disabled = true;
  btn.textContent = '⏳ Starting...';

  try {
    const res = await api.scraper.start({ query, maxResults });
    const jobId = res.data.jobId;

    document.getElementById('scrapeResult').innerHTML = `
      <div class="activity-item">
        <div class="activity-dot pending"></div>
        <div class="activity-content">
          <div class="activity-title">Scrape job started in background...</div>
          <div class="activity-meta">You can close this modal. Leads will appear here when done.</div>
        </div>
      </div>
    `;

    showToast('Scraping job started in background', 'success');

    // Optional: simple polling (could be improved to use SSE/WebSockets)
    const pollInterval = setInterval(async () => {
      try {
        const statusRes = await api.scraper.status(jobId);
        const st = statusRes.data;
        if (st.status === 'completed') {
          clearInterval(pollInterval);
          showToast(`Scrape complete! Added ${st.leadsFound} new leads.`, 'success');
          loadLeads();
          loadDashboard();
        } else if (st.status === 'failed') {
          clearInterval(pollInterval);
          showToast(`Scrape failed: ${st.error}`, 'error');
        }
      } catch (e) {
        clearInterval(pollInterval);
      }
    }, 5000);

  } catch (error) {
    showToast('Failed to start scraping: ' + error.message, 'error');
    document.getElementById('scrapeResult').innerHTML = `
      <div style="color:var(--accent-danger);font-size:13px">${error.message}</div>
    `;
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Start Scraping';
  }
}

// ══════════════════════════════
// ── Initialization ──
// ══════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  loadSettingsBadge();
});

async function loadSettingsBadge() {
  try {
    const res = await api.settings.get();
    const s = res.data;
    const dryBadge = document.getElementById('dryRunBadge');
    dryBadge.style.display = s.dry_run_mode === 'true' ? 'flex' : 'none';
  } catch (e) {
    // Silent fail on first load
  }
}
