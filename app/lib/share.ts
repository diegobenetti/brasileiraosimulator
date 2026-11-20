import type { Team } from './standings';

// Public URL of the deployed site (GitHub Pages), basePath included. Social
// networks need absolute URLs for og:image and for the link being shared.
export const SITE_URL = 'https://diegobenetti.github.io/brasileiraosimulator';

export const TEAM_COUNT = 20;

export const SHARE_IMAGE_SIZE = { width: 1200, height: 630 };

// ── Zones ────────────────────────────────────────────────────────────────────
// Single source of truth for what each final position means. The standings
// table colors and the share card both read from here.

export type ZoneId = 'champion' | 'libertadores' | 'pre-libertadores' | 'mid' | 'sudamericana' | 'relegation';

export interface Zone {
  id: ZoneId;
  /** Short badge shown on the share card, e.g. "CAMPEÃO". */
  badge: string;
  /** Sentence describing the outcome, used in titles/descriptions. */
  outcome: string;
  /** Accent color (hex) used by the share card and image. */
  color: string;
  emoji: string;
}

export function getZone(position: number): Zone {
  if (position === 1)
    return { id: 'champion', badge: 'Campeão', outcome: 'campeão brasileiro', color: '#facc15', emoji: '🏆' };
  if (position <= 4)
    return { id: 'libertadores', badge: 'Libertadores', outcome: 'classificado para a Libertadores', color: '#10b981', emoji: '🌎' };
  if (position <= 6)
    return { id: 'pre-libertadores', badge: 'Pré-Libertadores', outcome: 'na pré-Libertadores', color: '#eab308', emoji: '🎟️' };
  if (position <= 12)
    return { id: 'mid', badge: 'Meio de tabela', outcome: 'no meio da tabela', color: '#9ca3af', emoji: '😐' };
  if (position <= 16)
    return { id: 'sudamericana', badge: 'Sul-Americana', outcome: 'classificado para a Sul-Americana', color: '#0ea5e9', emoji: '✈️' };
  return { id: 'relegation', badge: 'Rebaixado', outcome: 'rebaixado para a Série B', color: '#ef4444', emoji: '⬇️' };
}

// ── Slugs ────────────────────────────────────────────────────────────────────

export function slugify(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function teamSlug(team: Team): string {
  return slugify(team.displayName);
}

export function findTeamBySlug(teams: Record<string, Team>, slug: string): Team | undefined {
  return Object.values(teams).find((t) => teamSlug(t) === slug);
}

/** Path (without basePath) of the share page for a team's projected position. */
export function sharePath(team: Team, position: number): string {
  return `/projecao/${teamSlug(team)}/${position}`;
}

export function shareUrl(team: Team, position: number): string {
  return `${SITE_URL}${sharePath(team, position)}`;
}

export function shareText(team: Team, position: number): string {
  const zone = getZone(position);
  return `Na minha projeção, o ${team.displayName} termina o Brasileirão em ${position}º: ${zone.outcome} ${zone.emoji}. E o seu time, onde termina?`;
}
