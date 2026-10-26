import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Trophy, ArrowRight, Zap, Clock, Pause, Play, FastForward } from 'lucide-react';
import { GameRoomState, LeaderboardEntry } from '../../types/index.ts';

interface Props {
  roomState: GameRoomState;
  onNextQuestion: () => void;
  onShowPodium: () => void;
}

export const ProjectorRanking: React.FC<Props> = ({
  roomState,
  onNextQuestion,
  onShowPodium
}) => {
  const isLastQuestion = roomState.currentQuestionIndex + 1 >= roomState.totalQuestions;
  const ranking = roomState.ranking || [];

  // Auto-advance timer (7 seconds to review the leaderboard)
  const [countdown, setCountdown] = useState<number>(7);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const hasAdvancedRef = useRef<boolean>(false);

  const handleAdvance = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    if (isLastQuestion) {
      onShowPodium();
    } else {
      onNextQuestion();
    }
  }, [isLastQuestion, onNextQuestion, onShowPodium]);

  // Keyboard shortcut: Space, Enter, or ArrowRight advances immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
        e.preventDefault();
        handleAdvance();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleAdvance]);

  // Auto-advance timer
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAdvance();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, handleAdvance]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
                RANKING INTERMEDIO
              </span>
              <span className="text-xs text-slate-400">
                Pregunta {roomState.currentQuestionIndex + 1} de {roomState.totalQuestions}
              </span>
            </div>
            <h1 className="text-2xl font-black text-white">Tabla de Posiciones en Vivo</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Pause / Play auto-advance button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition"
            title="Pausar o reanudar el avance automático"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-teal-400" />}
            <span>{isPaused ? 'Pausado' : `Siguiente en ${countdown}s`}</span>
          </button>

          <button
            onClick={handleAdvance}
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition flex items-center gap-2 transform active:scale-95 cursor-pointer"
          >
            <span>{isLastQuestion ? 'Ir al Podio Final (Espacio)' : 'Siguiente Pregunta (Espacio)'}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Leaderboard Table with strict requirements */}
      <div className="my-6 max-w-5xl mx-auto w-full bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex-1 flex flex-col justify-between">
        <div>
          <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Desempate por velocidad: menor tiempo acumulado premia los puestos</span>
            </div>
            <span className="font-mono text-slate-500">{ranking.length} alumnos registrados</span>
          </div>

          <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400 text-xs uppercase tracking-wider font-bold sticky top-0 z-10 border-b border-slate-800">
                <tr>
                  <th className="py-4 px-6 w-24">Puesto</th>
                  <th className="py-4 px-6">Apellido y Nombre</th>
                  <th className="py-4 px-6 text-center">Respuestas Correctas (Pts)</th>
                  <th className="py-4 px-6 text-right">Tiempo Total Acumulado (s)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {ranking.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-slate-500 text-sm">
                      No hay alumnos conectados aún en esta partida.
                    </td>
                  </tr>
                ) : (
                  ranking.map((row: LeaderboardEntry) => {
                    const isFirst = row.rank === 1;
                    const isSecond = row.rank === 2;
                    const isThird = row.rank === 3;

                    return (
                      <tr
                        key={row.playerId}
                        className={`transition ${
                          isFirst
                            ? 'bg-amber-500/10 hover:bg-amber-500/15 font-bold'
                            : isSecond
                            ? 'bg-slate-800/40 hover:bg-slate-800/60'
                            : isThird
                            ? 'bg-amber-900/10 hover:bg-amber-900/20'
                            : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="py-4 px-6 font-mono text-base font-black">
                          {isFirst && <span className="text-amber-400">🥇 1º</span>}
                          {isSecond && <span className="text-slate-300">🥈 2º</span>}
                          {isThird && <span className="text-amber-600">🥉 3º</span>}
                          {!isFirst && !isSecond && !isThird && (
                            <span className="text-slate-400">{row.rank}º</span>
                          )}
                        </td>

                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className="text-base text-white font-bold">{row.fullName}</span>
                            {row.isCorrectLastRound && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                +1 pto
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-center">
                          <span className="inline-block px-4 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 font-extrabold font-mono text-base border border-emerald-500/30">
                            {row.score} pts
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right font-mono font-bold text-amber-400 text-base">
                          <span className="flex items-center justify-end gap-1.5">
                            <Clock className="w-4 h-4 text-amber-500" />
                            {row.totalTime.toFixed(3)}s
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Auto-advance notification footer */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-pulse" />
            <span>
              {isPaused
                ? 'Avance automático en pausa.'
                : isLastQuestion
                ? `Mostrando podio final en ${countdown} segundos...`
                : `Lanzando la siguiente pregunta en ${countdown} segundos...`}
            </span>
          </div>

          <button
            onClick={handleAdvance}
            className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 underline underline-offset-4 cursor-pointer"
          >
            <span>{isLastQuestion ? 'Ir al Podio ahora' : 'Iniciar Siguiente Pregunta ahora'}</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500">
        1 punto por acierto exacto • Desempate ordenado por menor tiempo acumulado en segundos • Presiona <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300 font-bold">Espacio</kbd> o <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300 font-bold">Enter</kbd> para avanzar
      </div>
    </div>
  );
};
