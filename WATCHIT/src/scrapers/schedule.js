const { config, cacheDir } = require('../config');
const { readCache, writeCache } = require('../utils');

const SPORTSRC_BASE = 'https://api.sportsrc.org';

// ── SportSRC API ────────────────────────────────────────────────────────────

async function fetchAllMatches() {
  try {
    const res = await fetch(`${SPORTSRC_BASE}/?data=matches&category=football`, {
      headers: { 'User-Agent': 'WATCHIT/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !Array.isArray(json.data)) return [];
    return json.data;
  } catch (err) {
    console.error('[schedule] SportSRC fetch failed:', err.message);
    return [];
  }
}

async function fetchMatchDetail(matchId) {
  try {
    const res = await fetch(`${SPORTSRC_BASE}/?data=detail&category=football&id=${matchId}`, {
      headers: { 'User-Agent': 'WATCHIT/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (!json.success || !json.data) return null;
    return json.data;
  } catch (err) {
    console.error('[schedule] SportSRC detail failed:', err.message);
    return null;
  }
}

function formatMatch(event) {
  const home = event.teams?.home?.name || '';
  const away = event.teams?.away?.name || '';
  const timestamp = event.date || 0;
  const poster = event.poster || event.teams?.home?.badge || '';

  return {
    id: event.id || `match-${home}-${away}-${timestamp}`,
    name: event.title || `${home} vs ${away}`,
    home,
    away,
    league: '',
    timestamp,
    poster,
    description: event.title || `${home} vs ${away}`,
    status: 'upcoming',
    sources: event.sources || []
  };
}

async function getUpcomingMatches() {
  const cacheKey = 'schedule_sportsrc';
  const cached = readCache(cacheDir, cacheKey, config.cacheTTL.schedule);
  if (cached) {
    console.log(`[schedule] Loaded ${cached.length} matches from cache`);
    return cached;
  }

  const raw = await fetchAllMatches();
  const matches = raw.map(formatMatch);

  const now = Date.now();
  for (const m of matches) {
    const diff = m.timestamp - now;
    if (diff < 0 && diff > -2 * 60 * 60 * 1000) {
      m.status = 'live';
    } else if (diff <= -2 * 60 * 60 * 1000) {
      m.status = 'finished';
    } else {
      m.status = 'upcoming';
    }
  }

  matches.sort((a, b) => a.timestamp - b.timestamp);

  writeCache(cacheDir, cacheKey, matches);
  console.log(`[schedule] Fetched ${matches.length} matches from SportSRC`);
  return matches;
}

module.exports = { getUpcomingMatches, fetchMatchDetail };
