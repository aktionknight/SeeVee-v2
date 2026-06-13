const { getDb } = require('../database/init');

function recordOpen(trackingId) {
  const db = getDb();
  const log = db.prepare('SELECT * FROM outreach_log WHERE tracking_id = ?').get(trackingId);
  if (!log) return null;

  // Only record first open
  if (!log.opened_at) {
    db.prepare("UPDATE outreach_log SET status = 'opened', opened_at = datetime('now') WHERE tracking_id = ?")
      .run(trackingId);

    // Update lead status
    db.prepare("UPDATE leads SET status = 'opened', updated_at = datetime('now') WHERE id = ? AND status != 'replied'")
      .run(log.lead_id);
  }

  return log;
}

function recordClick(trackingId) {
  const db = getDb();
  const log = db.prepare('SELECT * FROM outreach_log WHERE tracking_id = ?').get(trackingId);
  if (!log) return null;

  if (!log.clicked_at) {
    db.prepare("UPDATE outreach_log SET status = 'clicked', clicked_at = datetime('now') WHERE tracking_id = ?")
      .run(trackingId);
  }

  return log;
}

// Generate 1x1 transparent PNG pixel
function getTrackingPixel() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
}

module.exports = { recordOpen, recordClick, getTrackingPixel };
