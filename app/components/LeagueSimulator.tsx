'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
import { DonateModal } from './DonateModal';

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

function Crest({ url, alt, className = 'w-6 h-6' }: { url: string; alt: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={`${className} object-contain shrink-0`} loading="lazy" />;
}

function ScoreInput({
  value,
  onChange,
  tabIndex,
}: {
  value: string;
  onChange: (v: string) => void;
  tabIndex?: number;
}) {
  return (
    <input
      type="text"
      tabIndex={tabIndex}
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
  selectedTeams,
  onSelectTeam,
}: {
  standings: StandingRow[];
  teams: Record<string, Team>;
  selectedTeams: string[];
  onSelectTeam: (teamId: string) => void;
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
              const isSelected = selectedTeams.includes(row.teamId);
              return (
                <tr
                  key={row.teamId}
                  onClick={() => onSelectTeam(row.teamId)}
                  className={`border-t border-gray-800 text-white cursor-pointer transition-colors ${zoneClass(position)} ${
                    isSelected ? 'bg-blue-500/15' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <td className="text-center py-1.5 text-gray-500">{position}</td>
                  <td className="py-1.5 pl-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Crest url={team?.escudo ?? ''} alt={row.teamId} />
                      <span className={`truncate ${isSelected ? 'font-semibold text-blue-300' : ''}`}>
                        {team?.displayName ?? row.teamId}
                      </span>
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
  onScoreChange,
  showDate = true,
  selectedTeams = [],
  suppressHighlightBg,
}: {
  match: MatchRecord;
  teams: Record<string, Team>;
  score: ScoreEntry;
  onScoreChange: (side: 'home' | 'away', value: string) => void;
  showDate?: boolean;
  selectedTeams?: string[];
  suppressHighlightBg?: boolean;
}) {
  const home = teams[match.home];
  const away = teams[match.away];

  const isUnplayed = match.homeScore === null && match.awayScore === null;
  const isHomeSelected = selectedTeams.includes(match.home);
  const isAwaySelected = selectedTeams.includes(match.away);
  const isHighlighted = isUnplayed && (isHomeSelected || isAwaySelected) && !suppressHighlightBg;

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 border-t border-gray-800/60 first:border-t-0 ${
        isHighlighted ? 'bg-blue-500/10 ring-1 ring-inset ring-blue-500/30' : ''
      }`}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end text-right">
        <span className={`truncate text-sm ${isHomeSelected ? 'font-semibold text-blue-300' : ''}`}>
          {home?.displayName ?? match.home}
        </span>
        <Crest url={home?.escudo ?? ''} alt={match.home} />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {/* Matches with a real result stay editable by click/tap but are skipped by Tab,
            so keyboard users jump straight through the games still to be decided. */}
        <ScoreInput value={score.home} onChange={(v) => onScoreChange('home', v)} tabIndex={isUnplayed ? undefined : -1} />
        <span className="text-gray-600 text-xs select-none">×</span>
        <ScoreInput value={score.away} onChange={(v) => onScoreChange('away', v)} tabIndex={isUnplayed ? undefined : -1} />
      </div>

      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Crest url={away?.escudo ?? ''} alt={match.away} />
        <span className={`truncate text-sm ${isAwaySelected ? 'font-semibold text-blue-300' : ''}`}>
          {away?.displayName ?? match.away}
        </span>
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
  forceOpen,
  onlySelectedTeam,
  onScoreChange,
  selectedTeams = [],
}: {
  round: number;
  matches: MatchRecord[];
  teams: Record<string, Team>;
  scores: Scores;
  initialScores: Scores;
  defaultOpen: boolean;
  forceOpen?: boolean;
  onlySelectedTeam?: boolean;
  onScoreChange: (matchId: string, side: 'home' | 'away', value: string) => void;
  selectedTeams?: string[];
}) {
  const allPlayed = matches.every((m) => {
    const s = scores[m.id];
    return s && s.home !== '' && s.away !== '';
  });
  const isSimulated = matches.some((m) => matchIsModified(scores[m.id], initialScores[m.id]));
  const involvesSelected = (m: MatchRecord) => selectedTeams.includes(m.home) || selectedTeams.includes(m.away);
  const hasSelectedTeamMatch = matches.some(
    (m) => m.homeScore === null && m.awayScore === null && involvesSelected(m),
  );

  const displayedMatches = onlySelectedTeam ? matches.filter(involvesSelected) : matches;

  const showTwoColumns = displayedMatches.length > 1;
  const half = Math.ceil(displayedMatches.length / 2);
  const columns = showTwoColumns ? [displayedMatches.slice(0, half), displayedMatches.slice(half)] : [displayedMatches];

  return (
    <details
      open={forceOpen || defaultOpen}
      className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden"
    >
      <summary
        tabIndex={-1}
        className="cursor-pointer select-none list-none flex items-center justify-between px-3 py-2 bg-gray-800/60 hover:bg-gray-800"
      >
        <span className="flex items-center gap-1.5 font-bold text-sm tracking-wide text-white">
          Rodada {round}
          {hasSelectedTeamMatch && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" title="Time selecionado joga nesta rodada" />
          )}
        </span>
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
      <div className={showTwoColumns ? 'sm:grid sm:grid-cols-2 sm:divide-x sm:divide-gray-800/60' : undefined}>
        {columns.map((col, i) => (
          <div key={i}>
            {col.map((m) => (
              <MatchRow
                key={m.id}
                match={m}
                teams={teams}
                score={scores[m.id] ?? { home: '', away: '' }}
                onScoreChange={(side, value) => onScoreChange(m.id, side, value)}
                showDate={false}
                selectedTeams={selectedTeams}
                suppressHighlightBg={onlySelectedTeam}
              />
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}

function ConfirmResetModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-sm mx-4 bg-gray-900 border border-gray-700 rounded-2xl px-8 py-8 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold mb-2">Resetar simulação</h2>
        <p className="text-gray-400 text-sm mb-6">
          Isso vai apagar todos os placares simulados e voltar aos resultados reais. Essa ação não pode ser desfeita.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-9 text-sm px-4 rounded-full border border-gray-600 text-gray-300 hover:border-white hover:text-white cursor-pointer transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="h-9 text-sm px-4 rounded-full bg-red-600 text-white hover:bg-red-500 cursor-pointer transition-all"
          >
            Resetar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// Owns its own open state so toggling it re-renders just the menu, not the
// whole simulator (standings plus every round's score inputs), which is what
// made the menu feel laggy on phones.
function MobileMenu({
  canReset,
  onDonate,
  onReset,
}: {
  canReset: boolean;
  onDonate: () => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on any tap outside the menu (on pointerdown, so it reacts
  // immediately) or on Escape. A fixed backdrop can't do this: the header's
  // backdrop-blur makes it the containing block, trapping the backdrop inside it.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-expanded={open}
        className={`sm:hidden flex items-center justify-center h-9 w-9 rounded-full border touch-manipulation cursor-pointer shrink-0
          transition-[transform,background-color,border-color,color] duration-150 active:scale-90 ${
            open ? 'border-white/60 bg-gray-800 text-white' : 'border-gray-600 text-gray-300 active:bg-gray-800'
          }`}
      >
        <svg
          className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeWidth={2} d={open ? 'M6 6l12 12M18 6L6 18' : 'M4 7h16M4 12h16M4 17h16'} />
        </svg>
      </button>
      {/* Kept mounted so it can animate both in and out; outside taps close it (see effect). */}
      <div
        ref={menuRef}
        aria-hidden={!open}
        className={`sm:hidden absolute right-2 top-full mt-2 z-20 w-56 overflow-hidden rounded-xl border border-gray-700 bg-gray-900 shadow-2xl
          origin-top-right transition-[opacity,transform,visibility] duration-150 ease-out ${
            open ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'
          }`}
      >
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onDonate();
          }}
          className="flex w-full items-center justify-between px-4 py-3 text-sm text-gray-200 touch-manipulation hover:bg-gray-800 active:bg-gray-700 cursor-pointer"
        >
          Me pague um café
          <span aria-hidden="true">☕</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            onReset();
          }}
          disabled={!canReset}
          className="flex w-full items-center px-4 py-3 text-sm text-gray-200 border-t border-gray-800 touch-manipulation
            enabled:hover:bg-gray-800 enabled:active:bg-gray-700 enabled:cursor-pointer disabled:opacity-30"
        >
          Resetar simulação
        </button>
      </div>
    </>
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
  const storageKey = `brasileirao-sim-${meta.year}`;
  const teamStorageKey = 'brasileirao-sim-selected-team';

  const [scores, setScores] = useState<Scores>(initialScores);
  const [hydrated, setHydrated] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [focusFutureRounds, setFocusFutureRounds] = useState(false);
  // The toggle only makes sense while a team is highlighted, so ignore any
  // leftover value once the teams are cleared instead of the toggle unmounting mid-focus.
  const focusActive = selectedTeams.length > 0 && focusFutureRounds;
  const selectedTeamNames = selectedTeams.map((id) => teams[id]?.displayName ?? id).join(', ');
  const [focusHint, setFocusHint] = useState({ text: '', visible: false });
  const focusHintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Restore the last highlighted teams (kept across seasons/visits, unlike scores).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(teamStorageKey);
      if (saved) {
        // Older visits stored a single team id as a plain string.
        const parsed: unknown = saved.startsWith('[') ? JSON.parse(saved) : [saved];
        const valid = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string' && !!teams[id]) : [];
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedTeams(valid);
      }
    } catch {
      // localStorage unavailable — ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (selectedTeams.length > 0) {
        localStorage.setItem(teamStorageKey, JSON.stringify(selectedTeams));
      } else {
        localStorage.removeItem(teamStorageKey);
      }
    } catch {
      // localStorage unavailable — ignore
    }
  }, [selectedTeams]);

  // Load any simulation saved from a previous visit, but let real results
  // (now scraped in) always win over a stale simulated score.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved: Scores = JSON.parse(raw);
        const merged: Scores = {};
        for (const m of matches) {
          const isFinal = m.homeScore !== null && m.awayScore !== null;
          merged[m.id] = isFinal ? initialScores[m.id] : (saved[m.id] ?? initialScores[m.id]);
        }
        // Restoring saved state after mount (not a flash-prone value like a
        // date/theme) — patching the whole standings table via an inline
        // script before hydration isn't worth reimplementing computeStandings in JS.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setScores(merged);
        localStorage.setItem(storageKey, JSON.stringify(merged));
      }
    } catch {
      // localStorage unavailable or corrupted — fall back to server data
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist every change, once initial hydration/merge has happened.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(scores));
    } catch {
      // localStorage unavailable (e.g. private mode / quota) — ignore
    }
  }, [scores, hydrated, storageKey]);

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
    // The persist effect below writes this cleared state to localStorage too.
    setScores(initialScores);
    setConfirmResetOpen(false);
  }

  // Touch screens get no tooltip, so briefly spell out what the filter now shows.
  function showFocusHint(on: boolean) {
    const text = on ? 'Próximas rodadas filtradas' : 'Mostrando todos os jogos';
    setFocusHint({ text, visible: true });
    clearTimeout(focusHintTimer.current);
    focusHintTimer.current = setTimeout(() => setFocusHint((h) => ({ ...h, visible: false })), 2000);
  }

  function handleToggleFocus() {
    const next = !focusActive;
    setFocusFutureRounds(next);
    showFocusHint(next);
  }

  function handleSelectTeam(teamId: string) {
    const next = selectedTeams.includes(teamId)
      ? selectedTeams.filter((id) => id !== teamId)
      : [...selectedTeams, teamId];
    setSelectedTeams(next);
    // Comparing teams is the point of picking a second one, so jump straight to focus mode.
    if (next.length === 2 && selectedTeams.length === 1 && !focusFutureRounds) {
      setFocusFutureRounds(true);
      showFocusHint(true);
    }
  }

  // One pill for the whole selection: tapping the crests toggles the
  // "only these teams' matches" filter (lit up with a glow when on),
  // and the × behind the divider clears the selection. Rendered in the
  // header on desktop and below the standings on mobile.
  function renderTeamPill() {
    return (
      <div
        className={`flex items-stretch h-9 rounded-full border text-sm transition-all duration-300 shrink-0 ${
          focusActive
            ? 'border-blue-500/50 bg-blue-500/10 text-blue-300 shadow-[0_0_14px_-2px_rgb(59_130_246/0.45)]'
            : 'border-gray-700 text-gray-400'
        }`}
      >
        <button
          type="button"
          aria-pressed={focusActive}
          onClick={handleToggleFocus}
          title={
            focusActive
              ? 'Mostrar todos os jogos'
              : `Mostrar só os jogos de ${selectedTeamNames} nas próximas rodadas`
          }
          className={`group flex items-center gap-1.5 pl-2.5 pr-2 rounded-l-full cursor-pointer transition-colors ${
            focusActive ? 'hover:text-blue-200' : 'hover:text-white'
          }`}
        >
          <span
            className={`flex items-center gap-1.5 transition-opacity duration-300 ${
              focusActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'
            }`}
          >
            {selectedTeams.length >= 3 ? (
              // Overlap and fan the crests out like a hand of cards so many teams still fit.
              // drop-shadow follows each crest's transparent silhouette: the tight dark
              // shadows act as a die-cut outline separating overlapping crests, and the
              // soft offset one falls onto the crest underneath to give the stack depth.
              <span className="flex items-center -space-x-2">
                {selectedTeams.map((id, i) => (
                  <span
                    key={id}
                    className="inline-flex"
                    style={{
                      transform: `rotate(${(i - (selectedTeams.length - 1) / 2) * 8}deg)`,
                      filter:
                        'drop-shadow(0 0 0.5px rgb(3 7 18)) drop-shadow(0 0 0.5px rgb(3 7 18)) drop-shadow(-2px 1px 2px rgb(0 0 0 / 0.55))',
                    }}
                  >
                    <Crest url={teams[id]?.escudo ?? ''} alt={teams[id]?.displayName ?? id} className="w-5 h-5" />
                  </span>
                ))}
              </span>
            ) : (
              selectedTeams.map((id) => (
                <Crest key={id} url={teams[id]?.escudo ?? ''} alt={teams[id]?.displayName ?? id} className="w-5 h-5" />
              ))
            )}
            {selectedTeams.length === 1 && (
              // The standings row already shows who's selected, so skip the name on narrow screens.
              <span className="hidden sm:inline truncate max-w-[96px]">{selectedTeamNames}</span>
            )}
          </span>
          {/* Always shown so the filter is discoverable; grey while off, lit while on. */}
          <svg
            viewBox="0 0 16 16"
            fill="currentColor"
            className={`w-3 h-3 shrink-0 transition-colors duration-300 ${
              focusActive ? '' : 'text-gray-500 group-hover:text-gray-300'
            }`}
            aria-hidden="true"
          >
            <path d="M2 3h12l-4.5 5.25V13l-3-1.5V8.25L2 3z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTeams([])}
          title="Limpar seleção"
          aria-label="Limpar seleção"
          className={`flex items-center justify-center w-9 rounded-r-full border-l cursor-pointer transition-colors ${
            focusActive
              ? 'border-blue-500/30 hover:text-blue-200'
              : 'border-gray-700 hover:text-white'
          }`}
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
    );
  }

  // Browsers can't Tab into a collapsed <details>, so when Tab (or Shift+Tab)
  // leaves the last (or first) score input of a round, expand the next (or
  // previous) round that still has games to decide and move focus into it.
  // Fully played rounds are skipped, and navigation wraps around both ways:
  // Tab past the very last game goes to the first round, Shift+Tab before the
  // first game goes to the last one.
  function handleRoundsKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'Tab' || !(e.target instanceof HTMLInputElement)) return;
    const current = e.target.closest('details');
    if (!current) return;
    const tabbable = 'input:not([tabindex="-1"])';
    const inputs = current.querySelectorAll<HTMLInputElement>(tabbable);
    const edge = e.shiftKey ? inputs[0] : inputs[inputs.length - 1];
    if (edge !== e.target) return;

    const undecided = Array.from(e.currentTarget.querySelectorAll('details')).filter((d) => d.querySelector(tabbable));
    const index = undecided.indexOf(current);
    if (index === -1) return;
    const target = undecided[(index + (e.shiftKey ? -1 : 1) + undecided.length) % undecided.length];

    e.preventDefault();
    target.open = true;
    const targetInputs = target.querySelectorAll<HTMLInputElement>(tabbable);
    (e.shiftKey ? targetInputs[targetInputs.length - 1] : targetInputs[0]).focus();
  }

  const rounds = useMemo(() => {
    const allRounds = Object.keys(matchesByRound).map(Number);
    // Upcoming rounds go on top in chronological order; played rounds stay
    // below in the existing newest-first order. CBF's own "current round"
    // pointer (meta.currentRound) marks the last round already played.
    const upcoming = allRounds.filter((r) => r > meta.currentRound).sort((a, b) => a - b);
    const played = allRounds.filter((r) => r <= meta.currentRound).sort((a, b) => b - a);
    return [...upcoming, ...played];
  }, [matchesByRound, meta.currentRound]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="sticky top-0 z-10 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-2 sm:px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-bold tracking-tight truncate">Simulador Brasileirão {meta.year}</h1>
          <p className="text-xs text-gray-500">Rodada atual: {meta.currentRound} de {meta.totalRounds}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {selectedTeams.length > 0 && <div className="hidden sm:flex">{renderTeamPill()}</div>}
          {/* On mobile these secondary actions move into the menu below. */}
          <DonateModal open={donateOpen} onOpenChange={setDonateOpen} triggerClassName="hidden sm:flex" />
          <button
            onClick={() => setConfirmResetOpen(true)}
            disabled={!hasAnySimulation}
            className="hidden sm:flex items-center h-9 text-sm px-4 rounded-full border border-gray-600 text-gray-300 transition-all shrink-0
              enabled:hover:border-white enabled:hover:text-white enabled:cursor-pointer
              disabled:opacity-30 disabled:cursor-default"
          >
            Resetar
          </button>
          <MobileMenu
            canReset={hasAnySimulation}
            onDonate={() => setDonateOpen(true)}
            onReset={() => setConfirmResetOpen(true)}
          />
        </div>
      </header>

      {confirmResetOpen && (
        <ConfirmResetModal
          onConfirm={handleReset}
          onCancel={() => setConfirmResetOpen(false)}
        />
      )}

      <div className="max-w-[1400px] mx-auto px-2 sm:px-3 py-4 grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-4 items-start">
        <div className="lg:sticky lg:top-[72px]">
          <StandingsTable
            standings={standings}
            teams={teams}
            selectedTeams={selectedTeams}
            onSelectTeam={handleSelectTeam}
          />
          {selectedTeams.length > 0 && (
            // On mobile the selection sits right below the standings instead of
            // competing with the title for the header's narrow width.
            <div className="sm:hidden flex items-center gap-3 mt-3">
              {renderTeamPill()}
              {/* Touch screens have no tooltip, so briefly spell out what the filter now shows. */}
              <span
                role="status"
                className={`min-w-0 truncate text-xs text-gray-400 transition-opacity duration-300 ${
                  focusHint.visible ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {focusHint.text}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3" onKeyDown={handleRoundsKeyDown}>
          {rounds.map((round) => {
            const isFutureRound = round > meta.currentRound;
            return (
              <div
                key={round}
                className={
                  round === meta.totalRounds && meta.currentRound < meta.totalRounds
                    ? 'pb-3 border-b-2 border-amber-500/60'
                    : undefined
                }
              >
                <RoundSection
                  round={round}
                  matches={matchesByRound[round]}
                  teams={teams}
                  scores={scores}
                  initialScores={initialScores}
                  defaultOpen={round === defaultOpenRound}
                  forceOpen={focusActive && isFutureRound}
                  onlySelectedTeam={focusActive && isFutureRound}
                  onScoreChange={handleScoreChange}
                  selectedTeams={selectedTeams}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
