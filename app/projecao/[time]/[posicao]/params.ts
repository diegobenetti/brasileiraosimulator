import { notFound } from 'next/navigation';
import { loadTeams } from '../../../lib/data';
import { findTeamBySlug, TEAM_COUNT, teamSlug } from '../../../lib/share';
import type { Team } from '../../../lib/standings';

export type ShareParams = { time: string; posicao: string };

/** Every team × every final position: 20 × 20 = 400 static pages. */
export function allShareParams(): ShareParams[] {
  const teams = Object.values(loadTeams());
  const slugs = teams.map(teamSlug);
  const duplicate = slugs.find((s, i) => slugs.indexOf(s) !== i);
  if (duplicate) throw new Error(`Slug de time duplicado: "${duplicate}"`);

  return slugs.flatMap((time) =>
    Array.from({ length: TEAM_COUNT }, (_, i) => ({ time, posicao: String(i + 1) })),
  );
}

export async function resolveShareParams(params: Promise<ShareParams>): Promise<{ team: Team; position: number }> {
  const { time, posicao } = await params;
  const team = findTeamBySlug(loadTeams(), time);
  const position = Number(posicao);
  if (!team || !Number.isInteger(position) || position < 1 || position > TEAM_COUNT) notFound();
  return { team, position };
}
