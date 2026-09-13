export interface Team {
  id: string;
  originalName: string;
  displayName: string;
  escudo: string;
}

export interface MatchRecord {
  id: string;
  num: number;
  round: number;
  home: string;
  away: string;
  date: string | null;
  time: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

export type ScoreEntry = { home: string; away: string };
export type Scores = Record<string, ScoreEntry>; // key = match id

export interface StandingRow {
  teamId: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export function initialScoresFromMatches(matches: MatchRecord[]): Scores {
  const scores: Scores = {};
  for (const m of matches) {
    scores[m.id] = {
      home: m.homeScore === null ? '' : String(m.homeScore),
      away: m.awayScore === null ? '' : String(m.awayScore),
    };
  }
  return scores;
}

export function computeStandings(
  teams: Record<string, Team>,
  matches: MatchRecord[],
  scores: Scores,
): StandingRow[] {
  const stats: Record<string, StandingRow> = {};
  for (const id of Object.keys(teams)) {
    stats[id] = {
      teamId: id, played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0,
    };
  }

  for (const m of matches) {
    const s = scores[m.id];
    if (!s) continue;
    const h = parseInt(s.home, 10);
    const a = parseInt(s.away, 10);
    if (s.home === '' || s.away === '' || isNaN(h) || isNaN(a)) continue;

    const home = stats[m.home];
    const away = stats[m.away];
    if (!home || !away) continue;

    home.played++; away.played++;
    home.goalsFor += h; home.goalsAgainst += a;
    away.goalsFor += a; away.goalsAgainst += h;
    home.goalDifference += h - a;
    away.goalDifference += a - h;

    if (h > a) {
      home.won++; home.points += 3;
      away.lost++;
    } else if (a > h) {
      away.won++; away.points += 3;
      home.lost++;
    } else {
      home.drawn++; home.points++;
      away.drawn++; away.points++;
    }
  }

  return Object.values(stats).sort(
    (a, b) =>
      b.points - a.points ||
      b.won - a.won ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor,
  );
}

export function scoresAreModified(current: Scores, initial: Scores): boolean {
  for (const key of Object.keys(initial)) {
    const c = current[key] ?? { home: '', away: '' };
    const i = initial[key];
    if (c.home !== i.home || c.away !== i.away) return true;
  }
  return false;
}

export function matchIsModified(current: ScoreEntry | undefined, initial: ScoreEntry): boolean {
  const c = current ?? { home: '', away: '' };
  return c.home !== initial.home || c.away !== initial.away;
}
