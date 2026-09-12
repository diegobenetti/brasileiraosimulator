import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as https from 'https';
import * as tls from 'tls';

// ── Types ──────────────────────────────────────────────────────────────────

interface Team {
  id: string;
  name: string;
  escudo: string;
}

interface Match {
  id: string;
  num: number;
  round: number;
  home: string;
  away: string;
  date: string | null; // ISO yyyy-mm-dd, or null when not yet scheduled
  time: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

// CBF API shapes (only the fields we use)
interface CbfClube {
  id: string;
  nome: string;
  url_escudo: string;
  gols: string | null;
}

interface CbfJogo {
  id_jogo: string;
  num_jogo: string;
  rodada: string;
  mandante: CbfClube;
  visitante: CbfClube;
  data: string; // "dd/mm/yyyy" or "A Definir"
  hora: string;
}

interface CbfRodadaResponse {
  grupos: string[];
  jogos: { grupo: string; jogo: CbfJogo[] }[];
}

// ── Paths ──────────────────────────────────────────────────────────────────

const PROJECT_ROOT = process.cwd();
const DATA_DIR = join(PROJECT_ROOT, 'data');
const TEAMS_FILE = join(DATA_DIR, 'teams.json');
const MATCHES_FILE = join(DATA_DIR, 'matches.json');
const META_FILE = join(DATA_DIR, 'meta.json');

const YEAR = new Date().getFullYear();
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// cbf.com.br serves its leaf certificate without the intermediate CA, so
// strict TLS clients (Node, curl) can't build the chain even though the
// intermediate/root below are legitimate, publicly trusted Sectigo certs
// (fetched from the CA Issuers URLs in the leaf's Authority Information
// Access extension). Browsers tolerate this via AIA-chasing; we supply the
// missing links explicitly instead of disabling verification.
const CBF_INTERMEDIATE_CA = `-----BEGIN CERTIFICATE-----
MIIGTDCCBDSgAwIBAgIQLBo8dulD3d3/GRsxiQrtcTANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNMzYwMzIxMjM1OTU5WjBgMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTcwNQYDVQQDEy5TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gQ0EgT1YgUjM2MIIBojANBgkqhkiG9w0B
AQEFAAOCAY8AMIIBigKCAYEApkMtJ3R06jo0fceI0M52B7K+TyMeGcv2BQ5AVc3j
lYt76TvHIu/nNe22W/RJXX9rWUD/2GE6GF5x0V4bsY7K3IeJ8E7+KzG/TGboySfD
u+F52jqQBbY62ofhYjMeiAbLI02+FqwHeM8uIrUtcX8b2RCxF358TB0NHVccAXZc
FYgZndZCeXxjuca7pJJ20LLUnXtgXcjAE1vY4WvbReW0W6mkeZyNGdmpTcFs5Y+s
yy6LtE5Zocji9J9NlNnReox2RWVyEXpA1ChZ4gqN+ZpVSIQ0HBorVFbBKyhdZyEX
gZgNSNtBRwxqwIzJePJhYd4ZUhO1vk+/uP3nwDk0p95q/j7naXNCSvESnrHPypaB
WRK066nKfPRPi9m9kIOhMdYfS8giFRTcdgL24Ycilj7ecAK9Trh0VbjwouJ4WH+x
bt47u68ZFCD/ac55I0DNHkCpaPruj6e9Rmr7K46wZDAYXuEAqB7tGG/jd6JAA+H2
O44CV98NRsU213f1kScIZntNAgMBAAGjggGBMIIBfTAfBgNVHSMEGDAWgBRWc1hk
lfmSGrASKgRieaFAFYghSTAdBgNVHQ4EFgQU42Z0u3BojSxdTg6mSo+bNyKcgpIw
DgYDVR0PAQH/BAQDAgGGMBIGA1UdEwEB/wQIMAYBAf8CAQAwHQYDVR0lBBYwFAYI
KwYBBQUHAwEGCCsGAQUFBwMCMBsGA1UdIAQUMBIwBgYEVR0gADAIBgZngQwBAgIw
VAYDVR0fBE0wSzBJoEegRYZDaHR0cDovL2NybC5zZWN0aWdvLmNvbS9TZWN0aWdv
UHVibGljU2VydmVyQXV0aGVudGljYXRpb25Sb290UjQ2LmNybDCBhAYIKwYBBQUH
AQEEeDB2ME8GCCsGAQUFBzAChkNodHRwOi8vY3J0LnNlY3RpZ28uY29tL1NlY3Rp
Z29QdWJsaWNTZXJ2ZXJBdXRoZW50aWNhdGlvblJvb3RSNDYucDdjMCMGCCsGAQUF
BzABhhdodHRwOi8vb2NzcC5zZWN0aWdvLmNvbTANBgkqhkiG9w0BAQwFAAOCAgEA
BZXWDHWC3cubb/e1I1kzi8lPFiK/ZUoH09ufmVOrc5ObYH/XKkWUexSPqRkwKFKr
7r8OuG+p7VNB8rifX6uopqKAgsvZtZsq7iAFw04To6vNcxeBt1Eush3cQ4b8nbQR
MQLChgEAqwhuXp9P48T4QEBSksYav7+aFjNySsLYlPzNqVM3RNwvBdvp6vgDtGwc
xlKQZVuuNVIaoYyls8swhxDeSHKpRdxRauTLZ+pl+wGvy0pnrLEJGSz9mOEmfbod
e/XopR2NGqaHJ6bIjyxPu6UtyQGI26En7UAEozACrHz06Nx2jTAY9E6NeB6XuobE
wLK025ZRmvglcURG1BrV24tGHHTgxCe8M3oGlpUSMTKQ2dkgljZVYt+gKdFtWELZ
MuRdi+X3XsrR8LFz+aLUiDRfQqhmw3RxjIyVKvvu9UPYY1nsvxYmFnUSeM+2q1z/
iPUry+xDY9MC6+IhleKT094VKdFVp7LXH42+wvU+17lRolQ2mK2N/nBLVBwaIhib
QXw4VYKwB86Bc6eS6iqsc94KEgD/U4VsjmgfhK+Xp4NM+VYzTTa3QeV3p8xOM0cw
q1p8oZFA+OBcz3FYWpDIe5j0NWKlw9hXsTyPY/HeZUV59akskSOSRSmDfe8wJDPX
58uB9/7lud0G3x0pxQAcffP0ayKavNwDTw4UfJ34cEw=
-----END CERTIFICATE-----`;

const CBF_ROOT_CA = `-----BEGIN CERTIFICATE-----
MIIFijCCA3KgAwIBAgIQdY39i658BwD6qSWn4cetFDANBgkqhkiG9w0BAQwFADBf
MQswCQYDVQQGEwJHQjEYMBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQD
Ey1TZWN0aWdvIFB1YmxpYyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYw
HhcNMjEwMzIyMDAwMDAwWhcNNDYwMzIxMjM1OTU5WjBfMQswCQYDVQQGEwJHQjEY
MBYGA1UEChMPU2VjdGlnbyBMaW1pdGVkMTYwNAYDVQQDEy1TZWN0aWdvIFB1Ymxp
YyBTZXJ2ZXIgQXV0aGVudGljYXRpb24gUm9vdCBSNDYwggIiMA0GCSqGSIb3DQEB
AQUAA4ICDwAwggIKAoICAQCTvtU2UnXYASOgHEdCSe5jtrch/cSV1UgrJnwUUxDa
ef0rty2k1Cz66jLdScK5vQ9IPXtamFSvnl0xdE8H/FAh3aTPaE8bEmNtJZlMKpnz
SDBh+oF8HqcIStw+KxwfGExxqjWMrfhu6DtK2eWUAtaJhBOqbchPM8xQljeSM9xf
iOefVNlI8JhD1mb9nxc4Q8UBUQvX4yMPFF1bFOdLvt30yNoDN9HWOaEhUTCDsG3X
ME6WW5HwcCSrv0WBZEMNvSE6Lzzpng3LILVCJ8zab5vuZDCQOc2TZYEhMbUjUDM3
IuM47fgxMMxF/mL50V0yeUKH32rMVhlATc6qu/m1dkmU8Sf4kaWD5QazYw6A3OAS
VYCmO2a0OYctyPDQ0RTp5A1NDvZdV3LFOxxHVp3i1fuBYYzMTYCQNFu31xR13NgE
SJ/AwSiItOkcyqex8Va3e0lMWeUgFaiEAin6OJRpmkkGj80feRQXEgyDet4fsZfu
+Zd4KKTIRJLpfSYFplhym3kT2BFfrsU4YjRosoYwjviQYZ4ybPUHNs2iTG7sijbt
8uaZFURww3y8nDnAtOFr94MlI1fZEoDlSfB1D++N6xybVCi0ITz8fAr/73trdf+L
HaAZBav6+CuBQug4urv7qv094PPK306Xlynt8xhW6aWWrL3DkJiy4Pmi1KZHQ3xt
zwIDAQABo0IwQDAdBgNVHQ4EFgQUVnNYZJX5khqwEioEYnmhQBWIIUkwDgYDVR0P
AQH/BAQDAgGGMA8GA1UdEwEB/wQFMAMBAf8wDQYJKoZIhvcNAQEMBQADggIBAC9c
mTz8Bl6MlC5w6tIyMY208FHVvArzZJ8HXtXBc2hkeqK5Duj5XYUtqDdFqij0lgVQ
YKlJfp/imTYpE0RHap1VIDzYm/EDMrraQKFz6oOht0SmDpkBm+S8f74TlH7Kph52
gDY9hAaLMyZlbcp+nv4fjFg4exqDsQ+8FxG75gbMY/qB8oFM2gsQa6H61SilzwZA
Fv97fRheORKkU55+MkIQpiGRqRxOF3yEvJ+M0ejf5lG5Nkc/kLnHvALcWxxPDkjB
JYOcCj+esQMzEhonrPcibCTRAUH4WAP+JWgiH5paPHxsnnVI84HxZmduTILA7rpX
DhjvLpr3Etiga+kFpaHpaPi8TD8SHkXoUsCjvxInebnMMTzD9joiFgOgyY9mpFui
TdaBJQbpdqQACj7LzTWb4OE4y2BThihCQRxEV+ioratF4yUQvNs+ZUH7G6aXD+u5
dHn5HrwdVw1Hr8Mvn4dGp+smWg9WY7ViYG4A++MnESLn/pmPNPW56MORcr3Ywx65
LvKRRFHQV80MNNVIIb/bE/FmJUNS0nAiNs2fxBx1IK1jcmMGDw4nztJqDby1ORrp
0XZ60Vzk50lJLVU3aPAaOpg+VBeHVOmmJ1CJeyAvP/+/oYtKR5j/K3tJPsMpRmAY
QqszKbrAKbkTidOIijlBO8n9pu0f9GBj39ItVQGL
-----END CERTIFICATE-----`;

const cbfAgent = new https.Agent({
  ca: [...tls.rootCertificates, CBF_INTERMEDIATE_CA, CBF_ROOT_CA],
});

// ── Helpers ────────────────────────────────────────────────────────────────

function ensureDirs() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function httpGet(url: string, accept: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { agent: cbfAgent, headers: { 'User-Agent': USER_AGENT, Accept: accept } }, (res) => {
        if (!res.statusCode || res.statusCode >= 400) {
          reject(new Error(`${res.statusCode} ${res.statusMessage} — ${url}`));
          res.resume();
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      })
      .on('error', reject);
  });
}

async function fetchText(url: string): Promise<string> {
  return httpGet(url, 'text/html');
}

async function fetchJson<T>(url: string): Promise<T> {
  const text = await httpGet(url, 'application/json');
  return JSON.parse(text) as T;
}

function parseDate(brDate: string): string | null {
  const m = brDate.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function parseScore(gols: string | null | undefined): number | null {
  if (gols === null || gols === undefined || gols === '') return null;
  const n = parseInt(gols, 10);
  return isNaN(n) ? null : n;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Discover the current competition id + round from the tabela page ──────

async function getCompetitionInfo(
  year: number,
): Promise<{ competitionId: string; currentRound: number; totalRounds: number }> {
  const url = `https://www.cbf.com.br/futebol-brasileiro/tabelas/campeonato-brasileiro/serie-a/${year}`;
  const html = await fetchText(url);

  const m = html.match(
    /\\"competitionId\\":\\"(\d+)\\",\\"current\\":(\d+),\\"total\\":(\d+)/,
  );
  if (!m) {
    throw new Error(
      'Could not find competitionId/current/total round in the CBF tabela page. The page markup may have changed.',
    );
  }
  return { competitionId: m[1], currentRound: parseInt(m[2], 10), totalRounds: parseInt(m[3], 10) };
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  ensureDirs();

  console.log(`\nCampeonato Brasileiro Série A ${YEAR} — Scraper`);
  console.log('Descobrindo o id da competição na CBF...');

  const { competitionId, currentRound, totalRounds } = await getCompetitionInfo(YEAR);
  console.log(`  competitionId=${competitionId} rodada atual=${currentRound}/${totalRounds}`);

  const teams: Record<string, Team> = {};
  const matches: Match[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const url = `https://www.cbf.com.br/api/cbf/jogos/campeonato/${competitionId}/rodada/${round}/fase`;
    const resp = await fetchJson<CbfRodadaResponse>(url);

    const jogos = (resp.jogos ?? []).flatMap((g) => g.jogo ?? []);
    for (const jogo of jogos) {
      const { mandante, visitante } = jogo;

      teams[mandante.id] ??= { id: mandante.id, name: mandante.nome, escudo: mandante.url_escudo };
      teams[visitante.id] ??= { id: visitante.id, name: visitante.nome, escudo: visitante.url_escudo };

      matches.push({
        id: jogo.id_jogo,
        num: parseInt(jogo.num_jogo, 10),
        round: parseInt(jogo.rodada, 10),
        home: mandante.id,
        away: visitante.id,
        date: parseDate(jogo.data),
        time: jogo.hora?.trim() || null,
        homeScore: parseScore(mandante.gols),
        awayScore: parseScore(visitante.gols),
      });
    }

    process.stdout.write(`  Rodada ${String(round).padStart(2, '0')}: ${jogos.length} jogo(s) ok\r`);
    await sleep(120);
  }

  console.log(`\n\n${Object.keys(teams).length} times, ${matches.length} jogos no total.`);

  matches.sort((a, b) => a.round - b.round || a.num - b.num);

  writeFileSync(TEAMS_FILE, JSON.stringify(teams, null, 2));
  console.log('Salvo: data/teams.json');

  writeFileSync(MATCHES_FILE, JSON.stringify(matches, null, 2));
  console.log('Salvo: data/matches.json');

  const playedCount = matches.filter((m) => m.homeScore !== null).length;
  writeFileSync(
    META_FILE,
    JSON.stringify(
      { year: YEAR, competitionId, currentRound, totalRounds, playedCount, scrapedAt: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log('Salvo: data/meta.json');

  console.log(`\n${playedCount}/${matches.length} jogos já disputados.`);
  console.log('Concluído.');
}

main().catch((err) => {
  console.error('\nErro fatal:', err);
  process.exit(1);
});
