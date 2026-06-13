const Database = require('better-sqlite3');
const path = require('path');
const settings = require('../config/settings');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.dirname(settings.paths.database);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db;

function getDb() {
  if (!db) {
    db = new Database(settings.paths.database);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initSchema();
  }
  return db;
}

function initSchema() {
  const database = db;

  database.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      person_name TEXT NOT NULL,
      person_role TEXT NOT NULL DEFAULT 'founder',
      email TEXT,
      linkedin_url TEXT,
      company_website TEXT,
      company_size INTEGER DEFAULT 0,
      domain TEXT NOT NULL DEFAULT 'ai-ml',
      region TEXT NOT NULL DEFAULT 'india',
      source TEXT DEFAULT 'csv',
      email_verified INTEGER DEFAULT 0,
      priority_score REAL DEFAULT 5.0,
      status TEXT DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS outreach_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lead_id INTEGER NOT NULL,
      channel TEXT NOT NULL DEFAULT 'email',
      status TEXT NOT NULL DEFAULT 'pending',
      subject TEXT,
      body_preview TEXT,
      template_used TEXT,
      tracking_id TEXT UNIQUE,
      sent_at TEXT,
      opened_at TEXT,
      clicked_at TEXT,
      replied_at TEXT,
      follow_up_count INTEGER DEFAULT 0,
      next_follow_up_date TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leads_domain ON leads(domain);
    CREATE INDEX IF NOT EXISTS idx_leads_region ON leads(region);
    CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
    CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority_score DESC);
    CREATE INDEX IF NOT EXISTS idx_outreach_lead ON outreach_log(lead_id);
    CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_log(status);
    CREATE INDEX IF NOT EXISTS idx_outreach_tracking ON outreach_log(tracking_id);
    CREATE INDEX IF NOT EXISTS idx_outreach_followup ON outreach_log(next_follow_up_date);
  `);

  // Insert default settings if not present
  const insertSetting = database.prepare(
    'INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)'
  );
  const defaults = {
    daily_limit: '20',
    auto_send_enabled: 'false',
    follow_up_enabled: 'true',
    dry_run_mode: 'true',   // Start in dry-run mode for safety
  };
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value);
  }

  console.log('✅ Database schema initialized successfully');
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// If run directly, initialize and close
if (require.main === module) {
  getDb();
  console.log(`📁 Database created at: ${settings.paths.database}`);
  closeDb();
}

module.exports = { getDb, closeDb };
