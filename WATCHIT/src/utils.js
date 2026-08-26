const fs = require('fs');
const path = require('path');

// ── M3U Parser ──────────────────────────────────────────────────────────────

function parseM3U(content) {
  const channels = [];
  const lines = content.split('\n').map(l => l.trim());

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('#EXTINF:')) continue;

    const infoLine = lines[i];
    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith('#')) continue;

    const nameMatch = infoLine.match(/,(.+)$/);
    const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

    const groupMatch = infoLine.match(/group-title="([^"]*)"/i);
    const group = groupMatch ? groupMatch[1].trim() : '';

    const logoMatch = infoLine.match(/tvg-logo="([^"]*)"/i);
    const logo = logoMatch ? logoMatch[1].trim() : '';

    const countryMatch = infoLine.match(/tvg-country="([^"]*)"/i);
    const country = countryMatch ? countryMatch[1].trim() : '';

    const langMatch = infoLine.match(/tvg-language="([^"]*)"/i);
    const language = langMatch ? langMatch[1].trim() : '';

    channels.push({
      name,
      group,
      logo,
      country,
      language,
      url: urlLine.trim()
    });

    i++;
  }

  return channels;
}

// ── JSON File Cache ─────────────────────────────────────────────────────────

function getCachePath(cacheDir, key) {
  const safe = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(cacheDir, `${safe}.json`);
}

function readCache(cacheDir, key, ttl) {
  const filePath = getCachePath(cacheDir, key);
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (Date.now() - raw.timestamp > ttl * 1000) return null;
    return raw.data;
  } catch {
    return null;
  }
}

function writeCache(cacheDir, key, data) {
  const filePath = getCachePath(cacheDir, key);
  fs.writeFileSync(filePath, JSON.stringify({ timestamp: Date.now(), data }, null, 2), 'utf8');
}

// ── Fuzzy String Match ──────────────────────────────────────────────────────

function normalize(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatch(query, target) {
  const nq = normalize(query);
  const nt = normalize(target);

  if (nt.includes(nq) || nq.includes(nt)) return 1.0;

  const words = nq.split(' ');
  let matched = 0;
  for (const w of words) {
    if (nt.includes(w)) matched++;
  }
  if (matched > 0) {
    const score = matched / words.length;
    if (score >= 0.5) return score;
  }

  const dist = levenshtein(nq, nt);
  const maxLen = Math.max(nq.length, nt.length);
  return maxLen === 0 ? 0 : 1 - dist / maxLen;
}

module.exports = { parseM3U, readCache, writeCache, fuzzyMatch, normalize };
