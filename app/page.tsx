import { LeagueSimulator } from './components/LeagueSimulator';
import { loadMatches, loadMeta, loadTeams } from './lib/data';
import { initialScoresFromMatches } from './lib/standings';

export default function Home() {
  const teams = loadTeams();
  const matches = loadMatches();
  const meta = loadMeta();
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
