const { getUpcomingMatches } = require('./scrapers/schedule');

function filterMatches(matches, genre) {
  const now = Date.now();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  switch (genre) {
    case 'Live':
      return matches.filter(m => m.status === 'live');
    case 'Today':
      return matches.filter(m => m.timestamp >= todayStart.getTime() && m.timestamp < todayEnd.getTime());
    case 'Tomorrow':
      return matches.filter(m => m.timestamp >= todayEnd.getTime() && m.timestamp < tomorrowEnd.getTime());
    case 'All':
    default:
      return matches;
  }
}

function sortByTime(matches) {
  const STATUS_ORDER = { live: 0, upcoming: 1, finished: 2 };
  return [...matches].sort((a, b) => {
    const sa = STATUS_ORDER[a.status] ?? 3;
    const sb = STATUS_ORDER[b.status] ?? 3;
    if (sa !== sb) return sa - sb;
    return a.timestamp - b.timestamp;
  });
}

function toCatalogItem(match) {
  const date = new Date(match.timestamp);
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

  const statusTag = match.status === 'live' ? ' • LIVE NOW' :
    match.status === 'finished' ? ' • Finished' : '';

  return {
    id: match.id,
    type: 'tv',
    name: match.name,
    poster: match.poster || '',
    background: match.poster || '',
    logo: '',
    description: `${dateStr} ${timeStr}${statusTag}`,
    releaseInfo: date.getFullYear().toString(),
    runtime: match.status === 'live' ? 'LIVE' : match.status === 'finished' ? 'ENDED' : timeStr,
    behaviorHints: {
      defaultVideoId: match.id
    }
  };
}

async function getCatalog(genre) {
  const matches = await getUpcomingMatches();
  const filtered = filterMatches(matches, genre || 'All');
  const sorted = sortByTime(filtered);
  return sorted.map(toCatalogItem);
}

module.exports = { getCatalog };
