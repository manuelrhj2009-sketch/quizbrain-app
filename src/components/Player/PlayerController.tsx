import React, { useState } from 'react';
import { SUIT_DEFINITIONS } from '../../types/index.ts';
import { SoundEffects } from '../../services/sound.ts';

interface Props {
  onSelectOption: (optionIndex: number) => void;
  disabled?: boolean;
}

export const PlayerController: React.FC<Props> = ({ onSelectOption, disabled = false }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const handleTap = (index: number) => {
    if (disabled || selectedIdx !== null) return;
    setSelectedIdx(index);

    // Haptic vibration feedback on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(40);
      } catch {}
    }

    SoundEffects.playTap();
    onSelectOption(index);
  };

  // Pure 2x2 grid filling 100% of the mobile touch screen (h-screen / h-[100dvh])
  // WITHOUT ANY QUESTION TEXT - only colors and playing card suit symbols!
  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-slate-950 p-2 sm:p-3 grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 select-none touch-manipulation z-50">
      {[0, 1, 2, 3].map((optIdx) => {
        const suit = SUIT_DEFINITIONS[optIdx];

        // Specific colors and card suits:
        // 0: Rojo (Corazones ♥)
        // 1: Azul (Rombos ♦)
        // 2: Amarillo (Tréboles ♣)
        // 3: Verde (Espadas ♠)
        const bgStyles =
          optIdx === 0
            ? 'bg-rose-600 active:bg-rose-700 active:scale-[0.98]'
            : optIdx === 1
            ? 'bg-blue-600 active:bg-blue-700 active:scale-[0.98]'
            : optIdx === 2
            ? 'bg-amber-400 active:bg-amber-500 active:scale-[0.98]'
            : 'bg-emerald-600 active:bg-emerald-700 active:scale-[0.98]';

        const symbolColor =
          optIdx === 2 ? 'text-slate-950' : 'text-white';

        return (
          <button
            key={optIdx}
            type="button"
            onClick={() => handleTap(optIdx)}
            disabled={disabled || selectedIdx !== null}
            className={`w-full h-full rounded-3xl flex flex-col items-center justify-center transition-all duration-150 cursor-pointer shadow-2xl relative overflow-hidden active:brightness-90 ${bgStyles}`}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {/* Ambient card symbol shadow watermark */}
            <span
              className={`absolute text-8xl sm:text-9xl font-black opacity-15 select-none pointer-events-none scale-150 ${symbolColor}`}
            >
              {suit.symbol}
            </span>

            {/* Prominent Center Card Suit Symbol */}
            <span
              className={`relative z-10 text-6xl sm:text-7xl md:text-8xl font-black drop-shadow-md select-none ${symbolColor}`}
            >
              {suit.symbol}
            </span>

            {/* Color name label */}
            <span
              className={`relative z-10 text-xs sm:text-sm font-black uppercase tracking-widest mt-1 opacity-90 ${symbolColor}`}
            >
              {suit.colorName}
            </span>
          </button>
        );
      })}
    </div>
  );
};
