'use client';

import { useMemo, useState } from 'react';
import {
  computeStandings,
  matchIsModified,
  scoresAreModified,
  type MatchRecord,
  type ScoreEntry,
  type Scores,
  type StandingRow,
  type Team,
} from '../lib/standings';

interface Meta {
  year: number;
  currentRound: number;
  totalRounds: number;
  playedCount: number;
  scrapedAt: string;
}

// ── Zones (Libertadores / Sudamericana / Rebaixamento) ─────────────────────

function zoneClass(position: number): string {
  if (position <= 4) return 'border-l-4 border-l-emerald-500';
  if (position <= 6) return 'border-l-4 border-l-yellow-500';
  if (position <= 12) return 'border-l-4 border-l-transparent';
  if (position <= 16) return 'border-l-4 border-l-sky-500';
  return 'border-l-4 border-l-red-500';
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatMatchDate(iso: string | null, time: string | null): string {
  if (!iso) return 'A definir';
  const [y, m, d] = iso.split('-');
  const date = new Date(Number(y), Number(m) - 1, Number(d));
  const formatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  return time ? `${formatted} · ${time}` : formatted;
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Crest({ url, alt }: { url: string; alt: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="w-6 h-6 object-contain shrink-0" loading="lazy" />;
}

function ScoreInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      maxLength={2}
      value={value}
      placeholder="–"
      onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
      className="w-8 h-8 text-center bg-gray-800 border border-gray-700 rounded text-white text-sm
        focus:border-green-500 focus:outline-none placeholder-gray-600"
    />
  );
}

function StandingsTable({
  standings,
  teams,
}: {
  standings: StandingRow[];
  teams: Record<string, Team>;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="text-gray-500 text-[10px] sm:text-xs uppercase tracking-wider">
              <th className="text-center py-2 w-7 font-medium">#</th>
              <th className="text-left py-2 pl-1 font-medium">Time</th>
              <th className="text-center py-2 w-6 font-medium">P</th>
              <th className="text-center py-2 w-6 font-medium">V</th>
              <th className="text-center py-2 w-6 font-medium">E</th>
              <th className="text-center py-2 w-6 font-medium">D</th>
              <th className="text-center py-2 w-8 font-medium hidden sm:table-cell">GP</th>
              <th className="text-center py-2 w-8 font-medium hidden sm:table-cell">GC</th>
              <th className="text-center py-2 w-8 font-medium">SG</th>
              <th className="text-center py-2 w-9 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => {
              const team = teams[row.teamId];
              const position = i + 1;
              return (
                <tr
                  key={row.teamId}
                  className={`border-t border-gray-800 text-white ${zoneClass(position)}`}
                >
                  <td className="text-center py-1.5 text-gray-500">{position}</td>
                  <td className="py-1.5 pl-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Crest url={team?.escudo ?? ''} alt={row.teamId} />
                      <span className="truncate">{team?.name ?? row.teamId}</span>
                    </div>
                  </td>
                  <td className="text-center py-1.5">{row.played}</td>
                  <td className="text-center py-1.5">{row.won}</td>
                  <td className="text-center py-1.5">{row.drawn}</td>
                  <td className="text-center py-1.5">{row.lost}</td>
                  <td className="text-center py-1.5 hidden sm:table-cell">{row.goalsFor}</td>
                  <td className="text-center py-1.5 hidden sm:table-cell">{row.goalsAgainst}</td>
                  <td className="text-center py-1.5">
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="text-center py-1.5 font-bold">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 px-3 py-2 border-t border-gray-800 text-[10px] sm:text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Libertadores (fase de grupos)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" />Libertadores (pré-libertadores)</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500" />Sul-Americana</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" />Rebaixamento</span>
      </div>
    </div>
  );
}

function MatchRow({
  match,
  teams,
  score,
  initialScore,
  onScoreChange,
  showDate = true,
}: {
  match: MatchRecord;
  teams: Record<string, Team>;
  score: ScoreEntry;
  initialScore: ScoreEntry;
  onScoreChange: (side: 'home' | 'away', value: string) => void;
  showDate?: boolean;
}) {
  const home = teams[match.home];
  const away = teams[match.away];
  const modified = matchIsModified(score, initialScore);

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-t border-gray-800/60 first:border-t-0 ${
        modified ? 'bg-amber-500/5' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
        <span className="truncate text-sm">{home?.name ?? match.home}</span>
        <Crest url={home?.escudo ?? ''} alt={match.home} />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <ScoreInput value={score.home} onChange={(v) => onScoreChange('home', v)} />
        <span className="text-gray-600 text-xs select-none">×</span>
        <ScoreInput value={score.away} onChange={(v) => onScoreChange('away', v)} />
      </div>

      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Crest url={away?.escudo ?? ''} alt={match.away} />
        <span className="truncate text-sm">{away?.name ?? match.away}</span>
      </div>

      {showDate && (
        <div className="w-20 shrink-0 text-right text-[10px] text-gray-500 hidden sm:block">
          {formatMatchDate(match.date, match.time)}
        </div>
      )}
    </div>
  );
}

function RoundSection({
  round,
  matches,
  teams,
  scores,
  initialScores,
  defaultOpen,
  onScoreChange,
}: {
  round: number;
  matches: MatchRecord[];
  teams: Record<string, Team>;
  scores: Scores;
  initialScores: Scores;
  defaultOpen: boolean;
  onScoreChange: (matchId: string, side: 'home' | 'away', value: string) => void;
}) {
  const allPlayed = matches.every((m) => {
    const s = scores[m.id];
    return s && s.home !== '' && s.away !== '';
  });
  const isSimulated = matches.some((m) => matchIsModified(scores[m.id], initialScores[m.id]));

  const half = Math.ceil(matches.length / 2);
  const columns = [matches.slice(0, half), matches.slice(half)];

  return (
    <details open={defaultOpen} className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
      <summary className="cursor-pointer select-none list-none flex items-center justify-between px-3 py-2 bg-gray-800/60 hover:bg-gray-800">
        <span className="font-bold text-sm tracking-wide text-white">Rodada {round}</span>
        <div className="flex items-center gap-2">
          {isSimulated ? (
            <span className="text-[10px] font-semibold bg-amber-500 text-gray-950 px-2 py-0.5 rounded-full">
              SIMULADO
            </span>
          ) : allPlayed ? (
            <span className="text-[10px] font-semibold bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full">
              ENCERRADA
            </span>
          ) : (
            <span className="text-[10px] font-semibold bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">
              A DEFINIR
            </span>
          )}
          <svg
            className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>
      <div className="sm:grid sm:grid-cols-2 sm:divide-x sm:divide-gray-800/60">
        {columns.map((col, i) => (
          <div key={i}>
            {col.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                teams={teams}
                score={scores[m.id] ?? { home: '', away: '' }}
                initialScore={initialScores[m.id]}
                onScoreChange={(side, value) => onScoreChange(m.id, side, value)}
                showDate={false}
              />
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────

export function LeagueSimulator({
  teams,
  matches,
  initialScores,
  meta,
}: {
  teams: Record<string, Team>;
  matches: MatchRecord[];
  initialScores: Scores;
  meta: Meta;
}) {
  const [scores, setScores] = useState<Scores>(initialScores);

  const hasAnySimulation = scoresAreModified(scores, initialScores);

  const standings = useMemo(
    () => computeStandings(teams, matches, scores),
    [teams, matches, scores],
  );

  const matchesByRound = useMemo(() => {
    const byRound: Record<number, MatchRecord[]> = {};
    for (const m of matches) {
      (byRound[m.round] ??= []).push(m);
    }
    return byRound;
  }, [matches]);

  const defaultOpenRound = useMemo(() => {
    const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
    const isComplete = (r: number) =>
      matchesByRound[r]?.every((m) => m.homeScore !== null && m.awayScore !== null) ?? true;

    // Prefer CBF's own "current round" pointer; if it's already fully played
    // (common right after it closes), jump to the next round to simulate.
    let r = meta.currentRound;
    while (isComplete(r) && r < meta.totalRounds) r++;
    return rounds.includes(r) ? r : (rounds[rounds.length - 1] ?? 1);
  }, [matchesByRound, meta.currentRound, meta.totalRounds]);

  function handleScoreChange(matchId: string, side: 'home' | 'away', value: string) {
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { home: '', away: '' }), [side]: value },
    }));
  }

  function handleReset() {
    setScores(initialScores);
  }

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-2 sm:px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight truncate">Simulador Brasileirão {meta.year}</h1>
          <p className="text-xs text-gray-500">Rodada atual: {meta.currentRound} de {meta.totalRounds}</p>
        </div>
        <button
          onClick={handleReset}
          disabled={!hasAnySimulation}
          className="flex items-center h-9 text-sm px-4 rounded-full border border-gray-600 text-gray-300 transition-all shrink-0
            enabled:hover:border-white enabled:hover:text-white enabled:cursor-pointer
            disabled:opacity-30 disabled:cursor-default"
        >
          Resetar
        </button>
      </header>

      <div className="max-w-[1400px] mx-auto px-2 sm:px-3 py-4 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-4 items-start">
        <div className="lg:sticky lg:top-[72px]">
          <StandingsTable standings={standings} teams={teams} />
        </div>

        <div className="flex flex-col gap-3">
          {rounds.map((round) => (
            <RoundSection
              key={round}
              round={round}
              matches={matchesByRound[round]}
              teams={teams}
              scores={scores}
              initialScores={initialScores}
              defaultOpen={round === defaultOpenRound}
              onScoreChange={handleScoreChange}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
