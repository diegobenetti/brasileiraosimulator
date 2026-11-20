import { readFileSync } from 'fs';
import { join } from 'path';
import type { Team, MatchRecord } from './standings';

export interface Meta {
  year: number;
  currentRound: number;
  totalRounds: number;
  playedCount: number;
  scrapedAt: string;
}

const dataDir = join(process.cwd(), 'data');

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(join(dataDir, file), 'utf-8'));
}

export function loadTeams(): Record<string, Team> {
  return readJson('teams.json');
}

export function loadMatches(): MatchRecord[] {
  return readJson('matches.json');
}

export function loadMeta(): Meta {
  return readJson('meta.json');
}
