const { config, cacheDir } = require('../config');
const { parseM3U, readCache, writeCache } = require('../utils');

const SPORTS_KEYWORDS = [
  'sport', 'football', 'soccer', 'bein', 'bein sport', 'beinsports',
  'sky sport', 'sky football', 'espn', 'dazn', 'canal+',
  'fox sport', 'nbc sport', 'bt sport', 'tnt sport',
  'premier league', 'la liga', 'serie a', 'bundesliga',
  'ligue 1', 'champions league', 'europa league',
  'futbol', 'futebol', 'calcio', 'liga',
  'sportsnet', 'tsn', 'sky sports', 'bein haber',
  'alkass', 'الرياضية', 'abu dhabi sport', 'أبوظبي الرياضية',
  'ssc', 'shaheen', 'ksa sport', 'روتانا سينما',
  'beIN SPORTS MAX', 'beIN BOX OFFICE', 'beIN MOVIES',
  'dazn', 'paramount', 'peacock', 'fubo', 'sling'
];

function isSportsChannel(channel) {
  const name = channel.name.toLowerCase();
  const group = channel.group.toLowerCase();

  for (const kw of SPORTS_KEYWORDS) {
    if (name.includes(kw) || group.includes(kw)) return true;
  }
  return false;
}

async function fetchM3U(source) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const res = await fetch(source.url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WATCHIT-IPTV/1.0' }
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const all = parseM3U(text);
    const sports = all.filter(isSportsChannel);

    console.log(`[iptv] ${source.name}: ${all.length} total, ${sports.length} sports`);
    return sports;
  } catch (err) {
    console.error(`[iptv] Failed to fetch ${source.name}:`, err.message);
    return [];
  }
}

async function getAllSportsChannels() {
  const cacheKey = 'iptv_sports_all';
  const cached = readCache(cacheDir, cacheKey, config.cacheTTL.m3u);
  if (cached) {
    console.log(`[iptv] Loaded ${cached.length} channels from cache`);
    return cached;
  }

  const enabled = config.m3uSources.filter(s => s.enabled);
  const results = await Promise.all(enabled.map(fetchM3U));

  const allChannels = results.flat();
  const seen = new Set();
  const unique = allChannels.filter(ch => {
    const key = `${ch.name}|${ch.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  writeCache(cacheDir, cacheKey, unique);
  console.log(`[iptv] Total unique sports channels: ${unique.length}`);
  return unique;
}

async function getAllChannels() {
  const cacheKey = 'iptv_all';
  const cached = readCache(cacheDir, cacheKey, config.cacheTTL.m3u);
  if (cached) return cached;

  const enabled = config.m3uSources.filter(s => s.enabled);
  const results = await Promise.all(enabled.map(fetchM3U));

  const all = results.flat();
  const seen = new Set();
  const unique = all.filter(ch => {
    const key = `${ch.name}|${ch.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  writeCache(cacheDir, cacheKey, unique);
  return unique;
}

module.exports = { getAllSportsChannels, getAllChannels, isSportsChannel };
