const path = require('path');

// Load .env if present
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const settings = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',

  // Gmail SMTP
  gmail: {
    user: process.env.GMAIL_USER || '',
    appPassword: process.env.GMAIL_APP_PASSWORD || '',
  },

  // Sender
  sender: {
    name: process.env.SENDER_NAME || 'Your Name',
    intro: process.env.SENDER_INTRO || '',
  },

  // Apollo.io (for email enrichment)
  apolloApiKey: process.env.APOLLO_API_KEY || '',

  // Hunter.io
  hunterApiKey: process.env.HUNTER_API_KEY || '',

  // Apify
  apifyApiKey: process.env.APIFY_API_TOKEN || '',

  // Outreach
  outreach: {
    dailyLimit: parseInt(process.env.DAILY_EMAIL_LIMIT || '20', 10),
    minSendIntervalMs: parseInt(process.env.MIN_SEND_INTERVAL_MS || '120000', 10),
    followUpDay1: parseInt(process.env.FOLLOW_UP_DAY_1 || '3', 10),
    followUpDay2: parseInt(process.env.FOLLOW_UP_DAY_2 || '7', 10),
    sendingHoursStart: 9,  // 9 AM
    sendingHoursEnd: 18,   // 6 PM
  },

  // Paths
  paths: {
    database: path.join(__dirname, '..', 'database', 'cold-reach.db'),
    resume: path.join(__dirname, '..', 'assets', 'resume.pdf'),
    seedCsv: path.join(__dirname, '..', 'data', 'seed-leads.csv'),
    templates: path.join(__dirname, '..', 'templates'),
  },
};

module.exports = settings;
