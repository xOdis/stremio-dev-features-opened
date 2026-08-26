const { getUpcomingMatches, fetchMatchDetail } = require('./scrapers/schedule');
const { getAllSportsChannels } = require('./scrapers/iptv');
const { normalize } = require('./utils');

const LEAGUE_KEYWORDS = {
  'Premier League': ['premier league', 'premiership', 'pl ', ' epl'],
  'La Liga': ['la liga', 'laliga', 'liga '],
  'Bundesliga': ['bundesliga'],
  'Serie A': ['serie a', 'calcio'],
  'Ligue 1': ['ligue 1', 'ligue '],
  'Champions League': ['champions league', 'ucl', 'champions league'],
  'Europa League': ['europa league', 'uel'],
  'MLS': ['mls', 'major league soccer'],
  'Eredivisie': ['eredivisie'],
  'Primeira Liga': ['primeira liga', 'liga Portugal'],
  'Scottish Premiership': ['scottish premiership', 'spl'],
  'Serie B': ['serie b'],
  'Championship': ['championship', 'efl championship'],
  'Copa Libertadores': ['copa libertadores', 'libertadores'],
  'CAF': ['caf', 'african cup', 'afcon'],
  'World Cup': ['world cup', 'fifa'],
  'Friendly': ['friendly', 'friendly match'],
  'Liga MX': ['liga mx', 'mexican league'],
  'Brasileirao': ['brasileirao', 'brazilian'],
  'Saudi Pro League': ['saudi pro', 'spl saudi'],
  'Liga Portugal': ['liga portugal', 'primeira liga'],
  'Super Lig': ['super lig', 'turkish league']
};

function findMatchLeague(match) {
  const text = normalize(`${match.name} ${match.description || ''} ${match.league || ''}`);
  for (const [league, keywords] of Object.entries(LEAGUE_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw.trim())) return league;
    }
  }
  return null;
}

function exactWordMatch(query, target) {
  const nq = normalize(query);
  const nt = normalize(target);
  if (!nq || !nt) return 0;

  if (nt.includes(nq) || nq.includes(nt)) return 1.0;

  const words = nq.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return 0;

  let matched = 0;
  for (const w of words) {
    if (nt.includes(w)) matched++;
  }
  return matched / words.length;
}

function channelMatchesLeague(league, channel) {
  if (!league) return false;
  const keywords = LEAGUE_KEYWORDS[league];
  if (!keywords) return false;

  const chName = normalize(channel.name);
  const chGroup = normalize(channel.group);
  const combined = `${chName} ${chGroup}`;

  for (const kw of keywords) {
    if (combined.includes(kw.trim())) return true;
  }
  return false;
}

function scoreChannel(match, channel, league) {
  const homeScore = exactWordMatch(match.home, channel.name);
  const awayScore = exactWordMatch(match.away, channel.name);
  const teamScore = Math.max(homeScore, awayScore);

  const groupHome = exactWordMatch(match.home, channel.group);
  const groupAway = exactWordMatch(match.away, channel.group);
  const groupTeamScore = Math.max(groupHome, groupAway);

  const matchNameScore = exactWordMatch(match.name, channel.name);

  let score = 0;

  if (teamScore >= 1.0) {
    score += 10;
  } else if (teamScore >= 0.5) {
    score += 4;
  }

  if (groupTeamScore >= 1.0) {
    score += 6;
  } else if (groupTeamScore >= 0.5) {
    score += 2;
  }

  if (matchNameScore >= 0.8) {
    score += 8;
  } else if (matchNameScore >= 0.5) {
    score += 3;
  }

  if (league && channelMatchesLeague(league, channel)) {
    if (score > 0) {
      score += 3;
    }
  }

  const chLower = `${normalize(channel.name)} ${normalize(channel.group)}`;
  const homeLower = normalize(match.home);
  const awayLower = normalize(match.away);
  if (homeLower.length > 3 && awayLower.length > 3) {
    if (chLower.includes(homeLower) && chLower.includes(awayLower)) {
      score += 15;
    }
  }

  return score;
}

async function resolveStreams(matchId) {
  const matches = await getUpcomingMatches();
  const match = matches.find(m => m.id === matchId);
  if (!match) return [];

  const league = findMatchLeague(match);

  let embedStreams = [];

  if (match.sources && match.sources.length > 0) {
    embedStreams = match.sources.map((src, i) => ({
      url: src.embedUrl,
      name: src.language || `Stream ${i + 1}`,
      title: `[SportSRC] ${src.language || 'Stream ' + (i + 1)}${src.hd ? ' HD' : ''}${src.viewers ? ' (' + src.viewers + ' viewers)' : ''}`,
      behaviorHints: {
        bingeGroup: matchId,
        notSeekable: true,
        filename: `${match.home} vs ${match.away}.html`
      }
    }));
  } else {
    try {
      const detail = await fetchMatchDetail(matchId);
      if (detail && detail.sources && detail.sources.length > 0) {
        embedStreams = detail.sources.map((src, i) => ({
          url: src.embedUrl,
          name: src.language || `Stream ${i + 1}`,
          title: `[SportSRC] ${src.language || 'Stream ' + (i + 1)}${src.hd ? ' HD' : ''}${src.viewers ? ' (' + src.viewers + ' viewers)' : ''}`,
          behaviorHints: {
            bingeGroup: matchId,
            notSeekable: true,
            filename: `${match.home} vs ${match.away}.html`
          }
        }));
      }
    } catch (err) {
      console.error('[streams] Failed to fetch SportSRC detail:', err.message);
    }
  }

  let iptvStreams = [];

  try {
    const sportsChannels = await getAllSportsChannels();
    const scored = [];

    for (const ch of sportsChannels) {
      const score = scoreChannel(match, ch, league);
      if (score >= 6) {
        scored.push({ channel: ch, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 15);

    iptvStreams = top.map(({ channel, score }) => ({
      url: channel.url,
      name: channel.name,
      title: `[IPTV] ${channel.name}${channel.group ? ' (' + channel.group + ')' : ''}`,
      behaviorHints: {
        bingeGroup: matchId,
        notSeekable: true,
        filename: `${match.home} vs ${match.away}.m3u8`
      }
    }));

    if (iptvStreams.length > 0) {
      console.log(`[streams] ${match.name}: ${iptvStreams.length} IPTV matches (best score: ${scored[0]?.score})`);
    }
  } catch (err) {
    console.error('[streams] IPTV fallback error:', err.message);
  }

  return [...embedStreams, ...iptvStreams];
}

module.exports = { resolveStreams };
