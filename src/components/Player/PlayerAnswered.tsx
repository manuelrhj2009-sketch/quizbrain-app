import React from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import { SUIT_DEFINITIONS } from '../../types/index.ts';

interface Props {
  selectedOptionIndex: number;
  responseTimeSec?: number;
}

export const PlayerAnswered: React.FC<Props> = ({
  selectedOptionIndex,
  responseTimeSec
}) => {
  const suit = SUIT_DEFINITIONS[selectedOptionIndex];

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-slate-950 text-white flex flex-col justify-between items-center p-6 select-none text-center z-50">
      <div className="text-xs text-slate-500 font-mono pt-2">
        DocuQuiz Live • Bloqueo de Respuesta
      </div>

      <div className="space-y-6 max-w-sm my-auto">
        {/* Card Suit chosen badge */}
        <div className="relative">
          <div
            className={`w-28 h-28 mx-auto rounded-3xl flex items-center justify-center text-6xl font-black shadow-2xl ${
              selectedOptionIndex === 0
                ? 'bg-rose-600 text-white'
                : selectedOptionIndex === 1
                ? 'bg-blue-600 text-white'
                : selectedOptionIndex === 2
                ? 'bg-amber-400 text-slate-950'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {suit.symbol}
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black uppercase tracking-wider flex items-center gap-1 shadow-md">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Enviada</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">Respuesta enviada</h2>
          <p className="text-sm font-bold text-indigo-300">
            Espera al proyector para ver los resultados
          </p>
        </div>

        {responseTimeSec !== undefined && (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-2xl text-xs font-mono text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Tu tiempo: <strong>{responseTimeSec.toFixed(3)}s</strong></span>
          </div>
        )}
      </div>

      <div className="text-xs text-slate-500 pb-2">
        Tu elección está registrada en el servidor de forma milimétrica.
      </div>
    </div>
  );
};
