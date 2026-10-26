import React, { useEffect } from 'react';
import { CheckCircle2, XCircle, Trophy, Clock, ArrowUp } from 'lucide-react';
import { GameRoomState, Player } from '../../types/index.ts';
import { SoundEffects } from '../../services/sound.ts';

interface Props {
  player: Player;
  roomState: GameRoomState;
  selectedOptionIndex: number | null;
}

export const PlayerRoundResult: React.FC<Props> = ({
  player,
  roomState,
  selectedOptionIndex
}) => {
  const currentQ = roomState.currentQuestion;
  const correctIdx = currentQ?.correctOptionIndex;
  const isCorrect = selectedOptionIndex !== null && selectedOptionIndex === correctIdx;

  const currentRank = (roomState.ranking || []).find((r) => r.playerId === player.id)?.rank || 1;

  useEffect(() => {
    if (isCorrect) {
      SoundEffects.playCorrect();
    } else {
      SoundEffects.playIncorrect();
    }
  }, [isCorrect]);

  return (
    <div
      className={`fixed inset-0 w-full h-[100dvh] flex flex-col justify-between items-center p-6 select-none text-center transition-colors duration-500 z-50 ${
        isCorrect ? 'bg-emerald-950 text-white' : 'bg-rose-950 text-white'
      }`}
    >
      <div className="text-xs font-mono opacity-80 pt-2">
        Pregunta {roomState.currentQuestionIndex + 1} de {roomState.totalQuestions}
      </div>

      <div className="space-y-6 max-w-sm my-auto">
        <div className="relative">
          <div
            className={`w-28 h-28 mx-auto rounded-3xl flex items-center justify-center text-5xl shadow-2xl ${
              isCorrect
                ? 'bg-emerald-500 text-slate-950 animate-bounce'
                : 'bg-rose-600 text-white'
            }`}
          >
            {isCorrect ? <CheckCircle2 className="w-16 h-16" /> : <XCircle className="w-16 h-16" />}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-3xl font-black">
            {isCorrect ? '¡CORRECTO!' : '¡INCORRECTO!'}
          </h2>
          <p className="text-sm font-semibold opacity-90">
            {isCorrect ? '+1 Punto Obtenido' : '0 Puntos en esta ronda'}
          </p>
        </div>

        {/* Stats Card */}
        <div className="p-4 bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 opacity-80">
              <Trophy className="w-4 h-4 text-amber-400" />
              Puntos acumulados
            </span>
            <span className="font-mono font-black text-lg">{player.score} pts</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 opacity-80">
              <Clock className="w-4 h-4 text-amber-400" />
              Tiempo total invertido
            </span>
            <span className="font-mono font-bold text-amber-300">
              {player.totalTime.toFixed(3)}s
            </span>
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold uppercase tracking-wider">
            <span className="opacity-80">Posición actual en la sala</span>
            <span className="px-3 py-1 bg-white/20 rounded-lg text-sm font-black">
              #{currentRank} Puesto
            </span>
          </div>
        </div>
      </div>

      <div className="text-xs opacity-70 pb-2">
        Mira hacia el proyector para ver la retroalimentación didáctica y el ranking.
      </div>
    </div>
  );
};
