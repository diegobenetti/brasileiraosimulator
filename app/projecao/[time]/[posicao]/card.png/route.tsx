import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { loadMeta } from '../../../../lib/data';
import { getZone, SHARE_IMAGE_SIZE } from '../../../../lib/share';
import { allShareParams, resolveShareParams, type ShareParams } from '../params';

// A plain route handler (instead of the opengraph-image convention) so the
// exported file is named card.png: GitHub Pages picks the Content-Type from
// the extension, and WhatsApp/Facebook ignore images served as octet-stream.
// Static export: every image is rendered once at build time.
export const dynamic = 'force-static';
export const dynamicParams = false;

export function generateStaticParams(): ShareParams[] {
  return allShareParams();
}

// Crests are remote SVGs; inline them as data URIs so the image renderer
// doesn't depend on fetching during layout. Cached per build worker, since
// each crest is reused across that team's 20 images.
const crestCache = new Map<string, Promise<string | null>>();

function loadCrest(url: string): Promise<string | null> {
  let cached = crestCache.get(url);
  if (!cached) {
    cached = fetch(url)
      .then(async (res) => {
        if (!res.ok) return null;
        const type = res.headers.get('content-type')?.split(';')[0] || 'image/svg+xml';
        const data = Buffer.from(await res.arrayBuffer()).toString('base64');
        return `data:${type};base64,${data}`;
      })
      .catch(() => null);
    crestCache.set(url, cached);
  }
  return cached;
}

const fontsDir = join(process.cwd(), 'app/fonts');

export async function GET(_request: Request, { params }: { params: Promise<ShareParams> }) {
  const { team, position } = await resolveShareParams(params);
  const { year } = loadMeta();
  const zone = getZone(position);

  const [crest, bold, black] = await Promise.all([
    loadCrest(team.escudo),
    readFile(join(fontsDir, 'Geist-Bold.ttf')),
    readFile(join(fontsDir, 'Geist-Black.ttf')),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          background: `radial-gradient(circle at 25% 50%, ${zone.color}40 0%, #030712 60%)`,
          backgroundColor: '#030712',
          color: 'white',
          fontFamily: 'Geist',
          padding: '56px 72px',
        }}
      >
        {/* Left: crest */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 400 }}>
          {crest ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img src={crest} width={320} height={320} style={{ objectFit: 'contain' }} />
          ) : (
            <div style={{ display: 'flex', fontSize: 120, fontWeight: 900 }}>
              {team.displayName.slice(0, 3).toUpperCase()}
            </div>
          )}
        </div>

        {/* Right: result */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, paddingLeft: 48 }}>
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 700, color: '#9ca3af', letterSpacing: 3, textTransform: 'uppercase' }}>
            Projeção · Brasileirão {year}
          </div>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 900, marginTop: 16, lineHeight: 1.05 }}>
            {team.displayName}
          </div>
          <div style={{ display: 'flex', fontSize: 168, fontWeight: 900, color: zone.color, lineHeight: 1, marginTop: 8 }}>
            {position}º
          </div>
          <div style={{ display: 'flex', marginTop: 20 }}>
            <div
              style={{
                display: 'flex',
                fontSize: 36,
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: 2,
                color: '#030712',
                backgroundColor: zone.color,
                borderRadius: 999,
                padding: '10px 32px',
              }}
            >
              {zone.badge}
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#d1d5db', marginTop: 36 }}>
            E o seu time? Faça a sua projeção →
          </div>
        </div>
      </div>
    ),
    {
      ...SHARE_IMAGE_SIZE,
      fonts: [
        { name: 'Geist', data: bold, weight: 700, style: 'normal' },
        { name: 'Geist', data: black, weight: 900, style: 'normal' },
      ],
    },
  );
}
