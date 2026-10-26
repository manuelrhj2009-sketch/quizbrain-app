import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Clock, RotateCcw } from 'lucide-react';
import { GameRoomState, Player } from '../../types/index.ts';

interface Props {
  player: Player;
  roomState: GameRoomState;
  onPlayAgain: () => void;
}

export const PlayerFinalScreen: React.FC<Props> = ({
  player,
  roomState,
  onPlayAgain
}) => {
  const ranking = roomState.ranking || [];
  const myRank = ranking.find((r) => r.playerId === player.id)?.rank || 1;
  const isPodium = myRank <= 3;

  useEffect(() => {
    if (isPodium) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  }, [isPodium]);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-slate-950 text-white flex flex-col justify-between items-center p-6 select-none text-center z-50">
      <div className="text-xs text-slate-500 font-mono pt-2">
        DocuQuiz Live • Cuestionario Finalizado
      </div>

      <div className="space-y-6 max-w-sm my-auto">
        <div className="relative">
          <div
            className={`w-28 h-28 mx-auto rounded-3xl flex items-center justify-center text-5xl shadow-2xl ${
              myRank === 1
                ? 'bg-gradient-to-tr from-amber-400 to-yellow-300 text-slate-950 border-4 border-amber-200'
                : myRank === 2
                ? 'bg-gradient-to-tr from-slate-300 to-slate-100 text-slate-900 border-2 border-white'
                : myRank === 3
                ? 'bg-gradient-to-tr from-amber-700 to-amber-600 text-white border-2 border-amber-500'
                : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40'
            }`}
          >
            {myRank === 1 && '👑'}
            {myRank === 2 && '🥈'}
            {myRank === 3 && '🥉'}
            {myRank > 3 && <Award className="w-14 h-14" />}
          </div>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-300">
            {isPodium ? '¡Felicidades por llegar al Podio!' : '¡Buen Trabajo!'}
          </span>
          <h2 className="text-3xl font-black text-white">
            {myRank}º Lugar
          </h2>
          <p className="text-sm font-semibold text-slate-300">{player.fullName}</p>
        </div>

        {/* Breakdown Card */}
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3.5">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Trophy className="w-4 h-4 text-emerald-400" />
              Respuestas Correctas
            </span>
            <span className="font-mono font-extrabold text-emerald-400 text-base">
              {player.score} / {roomState.totalQuestions} pts
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-4 h-4 text-amber-400" />
              Tiempo Total Acumulado
            </span>
            <span className="font-mono font-bold text-amber-400 text-base">
              {player.totalTime.toFixed(3)}s
            </span>
          </div>
        </div>

        <button
          onClick={onPlayAgain}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Volver a Inicio de Alumno</span>
        </button>
      </div>

      <div className="text-xs text-slate-500 pb-2">
        Revisa la pantalla del proyector para ver el podio olímpico y la tabla completa.
      </div>
    </div>
  );
};
