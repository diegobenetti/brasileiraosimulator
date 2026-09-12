import { readFileSync } from 'fs';
import { join } from 'path';
import { LeagueSimulator } from './components/LeagueSimulator';
import { initialScoresFromMatches, type Team, type MatchRecord } from './lib/standings';

interface Meta {
  year: number;
  currentRound: number;
  totalRounds: number;
  playedCount: number;
  scrapedAt: string;
}

function loadData(): { teams: Record<string, Team>; matches: MatchRecord[]; meta: Meta } {
  const dataDir = join(process.cwd(), 'data');

  const teams: Record<string, Team> = JSON.parse(
    readFileSync(join(dataDir, 'teams.json'), 'utf-8'),
  );
  const matches: MatchRecord[] = JSON.parse(
    readFileSync(join(dataDir, 'matches.json'), 'utf-8'),
  );
  const meta: Meta = JSON.parse(readFileSync(join(dataDir, 'meta.json'), 'utf-8'));

  return { teams, matches, meta };
}

export default function Home() {
  const { teams, matches, meta } = loadData();
  const initialScores = initialScoresFromMatches(matches);

  return (
    <LeagueSimulator
      teams={teams}
      matches={matches}
      initialScores={initialScores}
      meta={meta}
    />
  );
}
