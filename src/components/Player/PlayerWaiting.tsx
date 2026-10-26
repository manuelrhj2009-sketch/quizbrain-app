import React from 'react';
import { Clock, CheckCircle2, Shield } from 'lucide-react';
import { Player, GameRoomState } from '../../types/index.ts';

interface Props {
  player: Player;
  roomState: GameRoomState;
}

export const PlayerWaiting: React.FC<Props> = ({ player, roomState }) => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between items-center p-6 select-none text-center">
      <div className="w-full flex items-center justify-between text-xs text-slate-400 border-b border-slate-900 pb-4">
        <span className="font-mono">PIN: {roomState.roomCode}</span>
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Conectado</span>
        </div>
      </div>

      <div className="space-y-6 max-w-sm my-auto">
        <div className="relative">
          <div className="w-24 h-24 mx-auto rounded-3xl bg-indigo-600/20 border-2 border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Clock className="w-12 h-12 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Listo</span>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-black text-white">¡Estás dentro!</h2>
          <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Alumno registrado
            </span>
            <span className="text-lg font-black text-indigo-300">{player.fullName}</span>
          </div>
        </div>

        <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl space-y-1">
          <p className="text-sm font-bold text-indigo-200">
            Espera a que el administrador inicie el juego
          </p>
          <p className="text-xs text-slate-400">
            En cuanto empiece la pregunta, tu celular se convertirá en un control remoto táctil de 4 colores y palos de baraja.
          </p>
        </div>
      </div>

      <div className="text-[11px] text-slate-500">
        Mira hacia el proyector para ver las preguntas y alternativas.
      </div>
    </div>
  );
};
