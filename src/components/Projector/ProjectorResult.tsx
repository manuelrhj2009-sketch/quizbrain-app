import React, { useEffect, useState, useRef, useCallback } from 'react';
import { CheckCircle2, XCircle, ArrowRight, BookOpen, BarChart3, Pause, Play, FastForward } from 'lucide-react';
import { GameRoomState, SUIT_DEFINITIONS } from '../../types/index.ts';
import { SoundEffects } from '../../services/sound.ts';

interface Props {
  roomState: GameRoomState;
  onNext: () => void;
}

export const ProjectorResult: React.FC<Props> = ({ roomState, onNext }) => {
  const currentQ = roomState.currentQuestion;
  const correctIdx = currentQ?.correctOptionIndex ?? 0;
  const distribution = roomState.distribution || { 0: 0, 1: 0, 2: 0, 3: 0 };
  const totalAnswers = roomState.answeredCount || 1;

  const isLastQuestion = roomState.currentQuestionIndex + 1 >= roomState.totalQuestions;

  // Auto-advance countdown (8 seconds to review didactics and chart)
  const [countdown, setCountdown] = useState<number>(8);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const hasAdvancedRef = useRef<boolean>(false);

  const handleAdvance = useCallback(() => {
    if (hasAdvancedRef.current) return;
    hasAdvancedRef.current = true;
    onNext();
  }, [onNext]);

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

  useEffect(() => {
    SoundEffects.playCorrect();
  }, []);

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

  if (!currentQ) return null;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1 bg-indigo-600/30 text-indigo-300 font-bold text-xs uppercase tracking-wider rounded-lg border border-indigo-500/30">
            Resultados de la Pregunta {roomState.currentQuestionIndex + 1}
          </span>
          <h2 className="text-sm text-slate-300 font-medium line-clamp-1">{currentQ.text}</h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-advance status indicator & pause button */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition"
            title="Pausar o reanudar el avance automático"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-indigo-400" />}
            <span>{isPaused ? 'Pausado' : `Auto-avance en ${countdown}s`}</span>
          </button>

          <button
            onClick={handleAdvance}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 active:scale-95 cursor-pointer"
          >
            <span>{isLastQuestion ? 'Ver Podio Final (Espacio)' : 'Ver Ranking (Espacio)'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Grid: Options with Answer Counts & Checkmarks */}
      <div className="my-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((optIdx) => {
          const opt = currentQ.options[optIdx];
          const suit = SUIT_DEFINITIONS[optIdx];
          const isCorrect = optIdx === correctIdx;
          const count = distribution[optIdx] || 0;
          const percentage = Math.round((count / (totalAnswers || 1)) * 100);

          return (
            <div
              key={optIdx}
              className={`relative p-5 rounded-2xl border-2 transition overflow-hidden ${
                isCorrect
                  ? 'border-emerald-500 bg-emerald-950/30 shadow-xl shadow-emerald-500/10'
                  : 'border-slate-800 bg-slate-900/60 opacity-70'
              }`}
            >
              {/* Background fill based on response percentage */}
              <div
                className={`absolute inset-0 opacity-15 pointer-events-none ${
                  isCorrect ? 'bg-emerald-500' : 'bg-slate-700'
                }`}
                style={{ width: `${percentage}%` }}
              />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black ${
                      optIdx === 0
                        ? 'bg-rose-600 text-white'
                        : optIdx === 1
                        ? 'bg-blue-600 text-white'
                        : optIdx === 2
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {suit.symbol}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-400 block mb-0.5">
                      {suit.colorName} ({suit.symbol})
                    </span>
                    <p className="text-lg font-bold text-white">{opt ? opt.text : `Opción ${optIdx + 1}`}</p>
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0">
                  {isCorrect ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-black">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>CORRECTA</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 text-slate-500 rounded-lg text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Incorrecta</span>
                    </div>
                  )}

                  <div className="mt-2 text-xs font-mono font-bold text-slate-300 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3 text-slate-400" />
                    <span>{count} votos ({percentage}%)</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Didactic Feedback & Justification Box */}
      <div className="p-6 bg-gradient-to-r from-indigo-950/70 via-slate-900 to-slate-900 border-2 border-indigo-500/40 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-indigo-300">
              Retroalimentación Didáctica (Basada en las fuentes)
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Presiona <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-white font-bold">Espacio</kbd> para avanzar
          </span>
        </div>
        <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-medium">
          {currentQ.feedback || 'Respuesta comprobada con el texto de estudio del cuaderno.'}
        </p>
      </div>

      {/* Bottom quick advance bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{isPaused ? 'Avance automático en pausa.' : `Avanzando automáticamente en ${countdown} segundos...`}</span>
        </div>

        <button
          onClick={handleAdvance}
          className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 underline underline-offset-4 cursor-pointer"
        >
          <span>Ir a la Tabla de Posiciones ahora</span>
          <FastForward className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
