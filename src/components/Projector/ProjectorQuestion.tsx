import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Users, Clock, FastForward, CheckCircle2 } from 'lucide-react';
import { GameRoomState, SUIT_DEFINITIONS } from '../../types/index.ts';
import { SoundEffects } from '../../services/sound.ts';

interface Props {
  roomState: GameRoomState;
  onSkipQuestion: () => void;
}

export const ProjectorQuestion: React.FC<Props> = ({ roomState, onSkipQuestion }) => {
  const currentQ = roomState.currentQuestion;
  const timeLimit = roomState.timePerQuestion || 15;
  const [timeLeft, setTimeLeft] = useState<number>(timeLimit);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const hasTriggeredEndRef = useRef<boolean>(false);

  const handleEndRound = useCallback(() => {
    if (hasTriggeredEndRef.current) return;
    hasTriggeredEndRef.current = true;
    setIsFinishing(true);
    onSkipQuestion();
  }, [onSkipQuestion]);

  // Keyboard shortcut: Spacebar, Enter, or ArrowRight advances to results
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowRight') {
        e.preventDefault();
        handleEndRound();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleEndRound]);

  useEffect(() => {
    hasTriggeredEndRef.current = false;
    setIsFinishing(false);
    const startTime = roomState.questionStartTime || Date.now();

    // Initial immediate calculation
    const initialElapsed = (Date.now() - startTime) / 1000;
    const initialRemaining = Math.max(0, Math.ceil(timeLimit - initialElapsed));
    setTimeLeft(initialRemaining);

    const interval = setInterval(() => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, Math.ceil(timeLimit - elapsedSec));
      setTimeLeft(remaining);

      // Play audio cues
      if (remaining <= 3 && remaining > 0) {
        SoundEffects.playWarningTick();
      } else if (remaining > 3) {
        SoundEffects.playTick();
      }

      // When countdown reaches 0, ensure transition to question results!
      if (remaining <= 0) {
        clearInterval(interval);
        handleEndRound();
      }
    }, 1000);

    // Hard fallback safety timer (timeLimit + 1 second)
    const safetyTimer = setTimeout(() => {
      handleEndRound();
    }, (timeLimit + 1) * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(safetyTimer);
    };
  }, [roomState.currentQuestionIndex, roomState.questionStartTime, timeLimit, handleEndRound]);

  if (!currentQ) return null;

  const percentLeft = Math.min(100, Math.max(0, (timeLeft / timeLimit) * 100));
  const allAnswered = roomState.playersCount > 0 && roomState.answeredCount >= roomState.playersCount;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none">
      {/* Top Question Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="px-4 py-1.5 bg-indigo-600 text-white font-extrabold text-sm sm:text-base rounded-xl shadow-md">
              Pregunta {roomState.currentQuestionIndex + 1} de {roomState.totalQuestions}
            </span>
            <span className="text-xs sm:text-sm text-slate-400 font-medium line-clamp-1">
              {roomState.quizTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition ${
              allAnswered
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}>
              {allAnswered ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Users className="w-4 h-4 text-indigo-400" />}
              <span>
                {roomState.answeredCount} / {roomState.playersCount} respondieron
              </span>
            </div>

            <button
              onClick={handleEndRound}
              className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 rounded-xl transition text-xs font-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
              title="Cerrar y ver resultados inmediatamente (Espacio / Enter)"
            >
              <FastForward className="w-4 h-4" />
              <span>Ver Resultados (Espacio)</span>
            </button>
          </div>
        </div>

        {/* Big Question Prompt Box */}
        <div className="p-8 sm:p-10 bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl text-center relative overflow-hidden">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-relaxed max-w-5xl mx-auto drop-shadow-md">
            {currentQ.text}
          </h2>

          {isFinishing && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600/30 border border-indigo-500/40 rounded-full text-xs font-bold text-indigo-300 animate-pulse">
              <span>¡Tiempo cumplido! Abriendo resultados...</span>
            </div>
          )}
        </div>
      </div>

      {/* Middle Countdown Timer Bar */}
      <div className="my-6 space-y-2">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
          <span className="flex items-center gap-1.5 text-amber-400">
            <Clock className="w-4 h-4" />
            Tiempo restante
          </span>
          <span className={`text-2xl font-black font-mono ${timeLeft <= 3 ? 'text-rose-500 animate-bounce' : 'text-amber-400'}`}>
            {timeLeft}s
          </span>
        </div>
        <div className="w-full h-3.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
          <div
            className={`h-full transition-all duration-1000 ease-linear rounded-full ${
              timeLeft <= 3 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-amber-500'
            }`}
            style={{ width: `${percentLeft}%` }}
          />
        </div>
      </div>

      {/* 2x2 Grid with 4 Alternatives, Unique Colors, and Card Suit Symbols */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 flex-1 items-stretch">
        {[0, 1, 2, 3].map((optIdx) => {
          const opt = currentQ.options[optIdx];
          const suit = SUIT_DEFINITIONS[optIdx];

          const style =
            optIdx === 0
              ? 'bg-rose-600 border-rose-500 text-white'
              : optIdx === 1
              ? 'bg-blue-600 border-blue-500 text-white'
              : optIdx === 2
              ? 'bg-amber-500 border-amber-400 text-slate-950 font-black'
              : 'bg-emerald-600 border-emerald-500 text-white';

          return (
            <div
              key={optIdx}
              className={`p-6 sm:p-8 rounded-3xl border-2 flex items-center gap-5 shadow-2xl transition transform hover:scale-[1.01] ${style}`}
            >
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-black shrink-0 shadow-inner ${
                  optIdx === 2 ? 'bg-slate-950/20 text-slate-950' : 'bg-white/20 text-white'
                }`}
              >
                {suit.symbol}
              </div>
              <div className="text-xl sm:text-2xl font-bold leading-snug line-clamp-3">
                {opt ? opt.text : `Opción ${optIdx + 1}`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
