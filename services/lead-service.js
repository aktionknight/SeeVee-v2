const fs = require('fs');
const path = require('path');
const { getDb } = require('../database/init');
const { parse } = require('csv-parse/sync');

function calculatePriority(companySize) {
  // Smaller companies get higher priority (closer to 10)
  if (companySize <= 10) return 10;
  if (companySize <= 25) return 9;
  if (companySize <= 50) return 8;
  if (companySize <= 100) return 7;
  if (companySize <= 200) return 6;
  if (companySize <= 500) return 5;
  return Math.max(1, 10 - Math.floor(companySize / 100));
}

function addLead(leadData) {
  const db = getDb();
  const priority = calculatePriority(leadData.company_size || 0);

  const stmt = db.prepare(`
    INSERT INTO leads (company_name, person_name, person_role, email, linkedin_url, 
      company_website, company_size, domain, region, source, email_verified, priority_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    leadData.company_name,
    leadData.person_name,
    leadData.person_role || 'founder',
    leadData.email || null,
    leadData.linkedin_url || null,
    leadData.company_website || null,
    leadData.company_size || 0,
    leadData.domain || 'ai-ml',
    leadData.region || 'india',
    leadData.source || 'manual',
    leadData.email_verified ? 1 : 0,
    priority
  );

  return { id: result.lastInsertRowid, priority };
}

function importFromCSV(filePath) {
  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`CSV file not found: ${absPath}`);
  }

  const content = fs.readFileSync(absPath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const db = getDb();
  let imported = 0;
  let skipped = 0;

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO leads (company_name, person_name, person_role, email, linkedin_url,
      company_website, company_size, domain, region, source, priority_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'csv', ?)
  `);

  const transaction = db.transaction((leads) => {
    for (const lead of leads) {
      const priority = calculatePriority(parseInt(lead.company_size, 10) || 0);
      const result = insertStmt.run(
        lead.company_name,
        lead.person_name,
        lead.person_role || 'founder',
        lead.email || null,
        lead.linkedin_url || null,
        lead.company_website || null,
        parseInt(lead.company_size, 10) || 0,
        lead.domain || 'ai-ml',
        lead.region || 'india',
        priority
      );
      if (result.changes > 0) imported++;
      else skipped++;
    }
  });

  transaction(records);
  console.log(`✅ Imported ${imported} leads, ${skipped} skipped (duplicates)`);
  return { imported, skipped, total: records.length };
}

function getAllLeads(filters = {}) {
  const db = getDb();
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (filters.domain) {
    query += ' AND domain = ?';
    params.push(filters.domain);
  }
  if (filters.region) {
    query += ' AND region = ?';
    params.push(filters.region);
  }
  if (filters.status) {
    query += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters.maxSize) {
    query += ' AND company_size <= ?';
    params.push(parseInt(filters.maxSize, 10));
  }
  if (filters.search) {
    query += ' AND (company_name LIKE ? OR person_name LIKE ? OR email LIKE ?)';
    const term = `%${filters.search}%`;
    params.push(term, term, term);
  }

  query += ' ORDER BY priority_score DESC, created_at DESC';

  if (filters.limit) {
    query += ' LIMIT ?';
    params.push(parseInt(filters.limit, 10));
  }

  return db.prepare(query).all(...params);
}

function getLeadById(id) {
  const db = getDb();
  return db.prepare('SELECT * FROM leads WHERE id = ?').get(id);
}

function updateLead(id, updates) {
  const db = getDb();
  const fields = [];
  const params = [];

  const allowedFields = ['company_name', 'person_name', 'person_role', 'email',
    'linkedin_url', 'company_website', 'company_size', 'domain', 'region',
    'email_verified', 'status'];

  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      fields.push(`${field} = ?`);
      params.push(updates[field]);
    }
  }

  if (updates.company_size !== undefined) {
    fields.push('priority_score = ?');
    params.push(calculatePriority(updates.company_size));
  }

  if (fields.length === 0) return null;

  fields.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE leads SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getLeadById(id);
}

function deleteLead(id) {
  const db = getDb();
  return db.prepare('DELETE FROM leads WHERE id = ?').run(id);
}

function clearAllLeads() {
  const db = getDb();
  // We should also probably clear the outreach_log for these leads since it has a foreign key constraint.
  // Actually, since foreign_keys = ON, if we have ON DELETE CASCADE it would be fine. 
  // Let's check init.js to see if it has ON DELETE CASCADE. If not, we delete from outreach_log first or just delete leads.
  // Let's just delete from leads. If it fails due to FK, we'll clear outreach_log too.
  // Safer to just delete all from outreach_log then leads.
  db.transaction(() => {
    db.prepare('DELETE FROM outreach_log').run();
    db.prepare('DELETE FROM leads').run();
  })();
  return { success: true };
}

function getLeadsByPriority(limit = 10) {
  const db = getDb();
  return db.prepare(`
    SELECT l.* FROM leads l
    LEFT JOIN outreach_log o ON l.id = o.lead_id AND o.channel = 'email'
    WHERE l.status = 'new' AND l.email IS NOT NULL AND l.email != ''
    GROUP BY l.id
    HAVING COUNT(o.id) = 0
    ORDER BY l.priority_score DESC
    LIMIT ?
  `).all(limit);
}

function getLeadCounts() {
  const db = getDb();
  const total = db.prepare('SELECT COUNT(*) as count FROM leads').get().count;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all();
  const byDomain = db.prepare('SELECT domain, COUNT(*) as count FROM leads GROUP BY domain').all();
  const byRegion = db.prepare('SELECT region, COUNT(*) as count FROM leads GROUP BY region').all();
  return { total, byStatus, byDomain, byRegion };
}

module.exports = {
  addLead,
  importFromCSV,
  getAllLeads,
  getLeadById,
  updateLead,
  deleteLead,
  clearAllLeads,
  getLeadsByPriority,
  getLeadCounts,
  calculatePriority,
};
