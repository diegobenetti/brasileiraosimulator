import type { Metadata } from 'next';
import Link from 'next/link';
import { loadMeta } from '../../../lib/data';
import { getZone, SHARE_IMAGE_SIZE, sharePath } from '../../../lib/share';
import { allShareParams, resolveShareParams, type ShareParams } from './params';

// Only the 400 pre-generated combinations exist; anything else is a 404.
export const dynamicParams = false;

export function generateStaticParams(): ShareParams[] {
  return allShareParams();
}

export async function generateMetadata({ params }: { params: Promise<ShareParams> }): Promise<Metadata> {
  const { team, position } = await resolveShareParams(params);
  const { year } = loadMeta();
  const zone = getZone(position);
  const title = `${team.displayName} ${position}º — ${zone.badge} | Simulador Brasileirão ${year}`;
  const description = `Nesta projeção, o ${team.displayName} termina o Brasileirão ${year} em ${position}º lugar: ${zone.outcome}. Faça a sua projeção e descubra onde o seu time termina.`;

  const path = sharePath(team, position);
  const image = {
    url: `${path}/card.png`,
    ...SHARE_IMAGE_SIZE,
    type: 'image/png',
    alt: `${team.displayName} em ${position}º na projeção do Brasileirão ${year}: ${zone.badge}`,
  };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      type: 'website',
      locale: 'pt_BR',
      siteName: 'Simulador Brasileirão',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  };
}

export default async function SharePage({ params }: { params: Promise<ShareParams> }) {
  const { team, position } = await resolveShareParams(params);
  const { year } = loadMeta();
  const zone = getZone(position);

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center px-4 py-10">
      <div
        className="w-full max-w-md rounded-3xl border border-gray-800 bg-gray-900 px-6 py-10 text-center shadow-2xl"
        style={{ boxShadow: `0 0 80px -20px ${zone.color}66` }}
      >
        <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Projeção · Brasileirão {year}</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={team.escudo} alt={team.displayName} className="mx-auto mt-8 h-28 w-28 object-contain" />

        <h1 className="mt-6 text-2xl font-bold">{team.displayName}</h1>

        <p className="mt-2 text-7xl font-black tabular-nums" style={{ color: zone.color }}>
          {position}º
        </p>

        <span
          className="mt-5 inline-block rounded-full px-4 py-1.5 text-sm font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${zone.color}26`, color: zone.color, border: `1px solid ${zone.color}66` }}
        >
          {zone.emoji} {zone.badge}
        </span>

        <p className="mt-6 text-sm text-gray-400">
          Alguém simulou o resto do campeonato e o {team.displayName} terminou {zone.outcome}.
        </p>
      </div>

      <p className="mt-10 text-lg font-semibold text-center">E o seu time, onde termina?</p>
      <Link
        href="/"
        className="mt-4 inline-flex items-center h-12 px-8 rounded-full bg-green-500 text-gray-950 font-bold hover:bg-green-400 transition-colors"
      >
        Fazer minha projeção
      </Link>
    </main>
  );
}
