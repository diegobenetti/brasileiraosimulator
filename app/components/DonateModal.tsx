'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

export function DonateModal() {
  const [open, setOpen] = useState(false);
  const [returnBase, setReturnBase] = useState('');

  useEffect(() => {
    setReturnBase(window.location.origin + window.location.pathname);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Me pague um café"
        className="donate-button flex items-center gap-1.5 h-9 pl-4 pr-4 sm:pr-4.5 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 text-white transition-transform hover:scale-105 hover:from-pink-400 hover:to-rose-500 cursor-pointer"
      >
        <span className="hidden sm:inline text-sm font-medium">Me pague um café</span>
        <span className="donate-heart text-base leading-none">☕</span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 bg-gray-900 border border-gray-700 rounded-2xl px-8 py-8 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-300 text-lg leading-none cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold mb-2">Me pague um café ☕</h2>
            <p className="text-gray-400 text-sm mb-6">
              Se este simulador te ajuda a acompanhar o Brasileirão, que tal pagar um cafezinho para ajudar a manter o projeto no ar?
            </p>

            <div>
              <div className="flex justify-center">
                <form
                  action="https://www.paypal.com/donate"
                  method="post"
                  target="_top"
                >
                  <input type="hidden" name="hosted_button_id" value="2QH5DJT2M4L96" />
                  {returnBase && (
                    <>
                      <input type="hidden" name="return" value={`${returnBase}?donation=done`} />
                      <input type="hidden" name="cancel_return" value={`${returnBase}?donation=canceled`} />
                    </>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <input
                    type="image"
                    src="https://www.paypalobjects.com/pt_BR/i/btn/btn_donate_LG.gif"
                    name="submit"
                    title="PayPal - The safer, easier way to pay online!"
                    alt="Faça doações com o botão do PayPal"
                    className="cursor-pointer"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    src="https://www.paypal.com/pt_BR/i/scr/pixel.gif"
                    width={1}
                    height={1}
                  />
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
