'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getZone, SITE_URL, sharePath, shareText, shareUrl } from '../lib/share';
import type { StandingRow, Team } from '../lib/standings';

// basePath-relative prefix ("/brasileiraosimulator"), so the preview image
// loads from the current host in dev as well as in production.
const BASE_PATH = new URL(SITE_URL).pathname.replace(/\/$/, '');

const ICON_BUTTON =
  'flex items-center justify-center h-11 rounded-full border border-gray-600 text-gray-200 hover:border-white hover:text-white transition-colors';

// Brand glyphs from Simple Icons (CC0).
function WhatsAppIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

function LinkIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5M14 10a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

export function ShareModal({
  standings,
  teams,
  initialTeamId,
  onClose,
}: {
  standings: StandingRow[];
  teams: Record<string, Team>;
  initialTeamId: string | undefined;
  onClose: () => void;
}) {
  const [teamId, setTeamId] = useState(initialTeamId ?? '');
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    // Feature-detected after mount: the server render can't know about navigator.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCanNativeShare(typeof navigator.share === 'function');
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const team = teams[teamId];
  const position = standings.findIndex((r) => r.teamId === teamId) + 1;
  const zone = position > 0 ? getZone(position) : undefined;
  const url = team && position > 0 ? shareUrl(team, position) : '';
  const text = team && position > 0 ? shareText(team, position) : '';

  async function handleNativeShare() {
    try {
      await navigator.share({ text, url });
    } catch {
      // User dismissed the share sheet — nothing to do.
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the link is still visible in the input below.
    }
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;
  const xHref = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        className="relative w-full sm:max-w-lg sm:mx-4 bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-2xl px-5 sm:px-6 py-6 text-white shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="share-title" className="text-lg font-bold">Compartilhar projeção</h2>
            <p className="text-gray-400 text-sm">Mostre onde o seu time termina na sua simulação.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex items-center justify-center h-8 w-8 shrink-0 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 cursor-pointer"
          >
            ×
          </button>
        </div>

        <p id="share-team-label" className="text-xs uppercase tracking-wider text-gray-500 mb-2">
          {team ? team.displayName : 'Escolha um time'}
        </p>
        {/* Crest grid in standings order: one tap picks a team, unlike a native
            <select>, which can't show images. */}
        <div role="radiogroup" aria-labelledby="share-team-label" className="grid grid-cols-5 gap-1.5">
          {standings.map((row, i) => {
            const t = teams[row.teamId];
            const selected = row.teamId === teamId;
            const name = t?.displayName ?? row.teamId;
            return (
              <button
                key={row.teamId}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${name}, ${i + 1}º`}
                title={name}
                onClick={() => setTeamId(row.teamId)}
                className={`flex flex-col items-center gap-1 py-2 rounded-lg border cursor-pointer touch-manipulation transition-all ${
                  selected
                    ? 'border-green-500 bg-green-500/15 shadow-[0_0_12px_-2px_rgb(34_197_94/0.5)]'
                    : 'border-gray-800 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t?.escudo ?? ''} alt="" className="w-8 h-8 object-contain" />
                <span
                  className={`text-[10px] font-semibold tabular-nums ${selected ? '' : 'text-gray-500'}`}
                  style={selected ? { color: getZone(i + 1).color } : undefined}
                >
                  {i + 1}º
                </span>
              </button>
            );
          })}
        </div>

        {team && zone && (
          <>
            {/* The actual image people will see in the link preview. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={`${teamId}-${position}`}
              src={`${BASE_PATH}${sharePath(team, position)}/card.png`}
              alt={`${team.displayName} em ${position}º: ${zone.badge}`}
              width={1200}
              height={630}
              className="mt-4 w-full h-auto rounded-xl border border-gray-800 bg-gray-950 aspect-[1200/630]"
            />

            <div className="mt-5 flex flex-col gap-2">
              {canNativeShare && (
                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="h-11 rounded-full bg-green-500 text-gray-950 font-bold hover:bg-green-400 cursor-pointer transition-colors"
                >
                  Compartilhar
                </button>
              )}
              <div className="grid grid-cols-3 gap-2">
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartilhar no WhatsApp"
                  title="WhatsApp"
                  className={ICON_BUTTON}
                >
                  <WhatsAppIcon />
                </a>
                <a
                  href={xHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartilhar no X"
                  title="X"
                  className={ICON_BUTTON}
                >
                  <XIcon />
                </a>
                <button
                  type="button"
                  onClick={handleCopy}
                  aria-label={copied ? 'Link copiado' : 'Copiar link'}
                  title={copied ? 'Link copiado' : 'Copiar link'}
                  className={`${ICON_BUTTON} cursor-pointer ${copied ? '!border-green-500 !text-green-400' : ''}`}
                >
                  {copied ? <CheckIcon /> : <LinkIcon />}
                </button>
              </div>
              {/* Screen readers get the copy confirmation without relying on the icon swap. */}
              <span role="status" className="sr-only">{copied ? 'Link copiado' : ''}</span>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
