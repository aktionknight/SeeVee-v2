const express = require('express');
const path = require('path');
const { getDb, closeDb } = require('./database/init');
const outreachService = require('./services/outreach-service');
const settings = require('./config/settings');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS for local dev
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
const leadRoutes = require('./routes/api-leads');
const outreachRoutes = require('./routes/api-outreach');
const dashboardRoutes = require('./routes/api-dashboard');
const trackerRoutes = require('./routes/api-tracker');
const scraperRoutes = require('./routes/api-scraper');

// Mount routes
app.use('/api/leads', leadRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/track', trackerRoutes);
app.use('/api/scraper', scraperRoutes);

// Settings routes (mounted on dashboard router)
app.get('/api/settings', (req, res) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM app_settings').all();
  const s = {};
  for (const row of rows) s[row.key] = row.value;
  res.json({ success: true, data: s });
});

app.put('/api/settings', (req, res) => {
  const db = getDb();
  const upsert = db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction((entries) => {
    for (const [key, value] of entries) upsert.run(key, String(value));
  });
  transaction(Object.entries(req.body));
  const rows = db.prepare('SELECT * FROM app_settings').all();
  const s = {};
  for (const row of rows) s[row.key] = row.value;
  res.json({ success: true, data: s });
});

// SPA fallback
app.get('/{*splat}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize database
getDb();

// Start scheduler
outreachService.startScheduler();

// Start server
const PORT = settings.port;
app.listen(PORT, () => {
  console.log('');
  console.log('  ╔═══════════════════════════════════════════════════════╗');
  console.log('  ║                                                       ║');
  console.log('  ║   🚀  Cold Reach Automation                           ║');
  console.log('  ║   ──────────────────────────────────                   ║');
  console.log(`  ║   Dashboard:  http://localhost:${PORT}                   ║`);
  console.log('  ║   Status:     Running ✅                               ║');
  console.log('  ║                                                       ║');
  console.log('  ╚═══════════════════════════════════════════════════════╝');
  console.log('');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down...');
  outreachService.stopScheduler();
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  outreachService.stopScheduler();
  closeDb();
  process.exit(0);
});
