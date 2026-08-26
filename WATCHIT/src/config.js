const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[config] Failed to load config.json:', err.message);
    return {
      port: 3000,
      m3uSources: [],
      scheduleApi: '',
      leagues: [],
      cacheDir: './cache',
      cacheTTL: { m3u: 21600, schedule: 3600 }
    };
  }
}

const config = loadConfig();

const cacheDir = path.resolve(__dirname, '..', config.cacheDir);
if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true });
}

module.exports = { config, cacheDir };
