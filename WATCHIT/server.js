const express = require('express');
const path = require('path');
const { config } = require('./src/config');
const { getCatalog } = require('./src/catalog');
const { resolveStreams } = require('./src/streams');

const app = express();

// ── CORS ────────────────────────────────────────────────────────────────────

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── Stremio Addon Protocol ──────────────────────────────────────────────────

app.get('/manifest.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'manifest.json'));
});

app.get('/catalog/:type/:id.json', async (req, res) => {
  try {
    const genre = req.query.genre || 'All';
    const extra = {};
    if (req.query.genre) extra.genre = req.query.genre;

    let genreFilter = 'All';
    if (extra.genre) {
      genreFilter = extra.genre;
    }

    const metas = await getCatalog(genreFilter);

    res.setHeader('Cache-Control', 'max-age=300');
    res.json({ metas });
  } catch (err) {
    console.error('[server] Catalog error:', err);
    res.status(500).json({ metas: [] });
  }
});

app.get('/stream/:type/:id.json', async (req, res) => {
  try {
    const matchId = req.params.id;
    const streams = await resolveStreams(matchId);

    res.setHeader('Cache-Control', 'max-age=60');
    res.json({ streams });
  } catch (err) {
    console.error('[server] Stream error:', err);
    res.status(500).json({ streams: [] });
  }
});

// ── Catch-all ───────────────────────────────────────────────────────────────

app.get('*', (req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Start ───────────────────────────────────────────────────────────────────

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════════╗
  ║         WATCHIT - Football Live              ║
  ║──────────────────────────────────────────────║
  ║  Server running on http://localhost:${PORT}     ║
  ║                                              ║
  ║  Install in Stremio:                         ║
  ║  http://localhost:${PORT}/manifest.json         ║
  ╚══════════════════════════════════════════════╝
  `);
});
