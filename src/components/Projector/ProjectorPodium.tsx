import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, CheckCircle, Home, Save, Clock, Zap } from 'lucide-react';
import { GameRoomState, GameSessionHistory, LeaderboardEntry } from '../../types/index.ts';
import { SoundEffects } from '../../services/sound.ts';
import { api } from '../../services/api.ts';

interface Props {
  roomState: GameRoomState;
  onExit: () => void;
}

export const ProjectorPodium: React.FC<Props> = ({ roomState, onExit }) => {
  const ranking = roomState.ranking || [];
  const first = ranking[0];
  const second = ranking[1];
  const third = ranking[2];

  const [hasSavedHistory, setHasSavedHistory] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    // Sound fanfare
    SoundEffects.playFanfare();

    // Trigger confetti cannon
    const duration = 4 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 }
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    // Auto-save session to notebook history
    autoSaveHistory();
  }, []);

  const autoSaveHistory = async () => {
    if (hasSavedHistory) return;
    setIsSaving(true);
    try {
      const historyEntry: GameSessionHistory = {
        id: `sess-${Date.now()}-${roomState.roomCode}`,
        quizId: roomState.quizId,
        quizTitle: roomState.quizTitle,
        playedAt: Date.now(),
        totalPlayers: roomState.playersCount,
        totalQuestions: roomState.totalQuestions,
        ranking: roomState.ranking
      };
      await api.saveHistory(roomState.notebookId, historyEntry);
      setHasSavedHistory(true);
    } catch (err) {
      console.error('Error auto-saving history:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      {/* Background ambient gold shine */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 text-amber-400 rounded-2xl border border-amber-500/30">
            <Trophy className="w-7 h-7 text-amber-400 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-mono font-bold border border-amber-500/30">
                PODIO Y RESULTADOS FINALES
              </span>
              <span className="text-xs text-slate-400">{roomState.quizTitle}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">¡Gran Final del Cuestionario!</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {hasSavedHistory ? (
            <div className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950/40 border border-emerald-700/50 rounded-xl text-emerald-300 text-xs font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Guardado en Cuaderno</span>
            </div>
          ) : (
            <button
              onClick={autoSaveHistory}
              disabled={isSaving}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Guardando...' : 'Guardar en Historial'}</span>
            </button>
          )}

          <button
            onClick={onExit}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Volver al Panel</span>
          </button>
        </div>
      </div>

      {/* Podium Display (Top 3) */}
      <div className="relative z-10 max-w-4xl mx-auto w-full my-6 flex items-end justify-center gap-4 sm:gap-6 pt-8 pb-4">
        {/* 2nd Place */}
        {second && (
          <div className="flex flex-col items-center flex-1 max-w-[220px]">
            <div className="text-center mb-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-gradient-to-tr from-slate-400 to-slate-200 text-slate-900 font-black text-2xl flex items-center justify-center shadow-lg border-2 border-white">
                🥈
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-2 line-clamp-1">
                {second.fullName}
              </h3>
              <p className="text-xs font-mono text-emerald-400 font-bold">{second.score} pts</p>
              <p className="text-[11px] font-mono text-amber-400">{second.totalTime.toFixed(3)}s</p>
            </div>
            <div className="w-full h-36 sm:h-44 bg-gradient-to-t from-slate-800 to-slate-700/80 rounded-t-3xl border-t-2 border-x-2 border-slate-500/50 flex flex-col items-center justify-center p-3 shadow-2xl">
              <span className="text-3xl font-black text-slate-300">2º</span>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold mt-1">Plata</span>
            </div>
          </div>
        )}

        {/* 1st Place */}
        {first && (
          <div className="flex flex-col items-center flex-1 max-w-[260px] -mt-6">
            <div className="text-center mb-3">
              <div className="relative">
                <div className="w-18 h-18 sm:w-22 sm:h-22 mx-auto rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-4xl flex items-center justify-center shadow-2xl border-4 border-amber-200">
                  👑
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                  Campeón
                </div>
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-white mt-3 line-clamp-1 drop-shadow">
                {first.fullName}
              </h3>
              <p className="text-sm font-mono text-emerald-300 font-extrabold">{first.score} pts</p>
              <p className="text-xs font-mono text-amber-300">{first.totalTime.toFixed(3)}s acumulados</p>
            </div>
            <div className="w-full h-48 sm:h-60 bg-gradient-to-t from-amber-600/40 via-amber-500/30 to-amber-400/20 rounded-t-3xl border-t-4 border-x-2 border-amber-400 flex flex-col items-center justify-center p-4 shadow-[0_0_40px_rgba(245,158,11,0.25)]">
              <span className="text-4xl sm:text-5xl font-black text-amber-300">1º</span>
              <span className="text-xs uppercase tracking-wider text-amber-200 font-black mt-1">Oro</span>
            </div>
          </div>
        )}

        {/* 3rd Place */}
        {third && (
          <div className="flex flex-col items-center flex-1 max-w-[220px]">
            <div className="text-center mb-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto rounded-2xl bg-gradient-to-tr from-amber-800 to-amber-600 text-white font-black text-2xl flex items-center justify-center shadow-lg border-2 border-amber-700">
                🥉
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-2 line-clamp-1">
                {third.fullName}
              </h3>
              <p className="text-xs font-mono text-emerald-400 font-bold">{third.score} pts</p>
              <p className="text-[11px] font-mono text-amber-400">{third.totalTime.toFixed(3)}s</p>
            </div>
            <div className="w-full h-28 sm:h-36 bg-gradient-to-t from-amber-950/70 to-amber-900/40 rounded-t-3xl border-t-2 border-x-2 border-amber-800/60 flex flex-col items-center justify-center p-3 shadow-xl">
              <span className="text-3xl font-black text-amber-500">3º</span>
              <span className="text-xs uppercase tracking-wider text-amber-600 font-bold mt-1">Bronce</span>
            </div>
          </div>
        )}
      </div>

      {/* Mandatory Final Leaderboard Table with Required Columns:
          [Puesto] [Apellido y Nombre] [Respuestas Correctas (Pts)] [Tiempo Total Acumulado (s)] */}
      <div className="relative z-10 max-w-5xl mx-auto w-full bg-slate-900/95 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Tabla de Posiciones Final Completa (Criterio Estricto de Desempate)
            </h3>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono">
            <Zap className="w-3.5 h-3.5" />
            <span>Mayor Puntos &gt; Menor Tiempo</span>
          </div>
        </div>

        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/90 text-slate-400 text-xs uppercase tracking-wider font-bold sticky top-0 z-10 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-6 w-28">Puesto</th>
                <th className="py-3.5 px-6">Apellido y Nombre</th>
                <th className="py-3.5 px-6 text-center">Respuestas Correctas (Pts)</th>
                <th className="py-3.5 px-6 text-right">Tiempo Total Acumulado (s)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {ranking.map((row: LeaderboardEntry) => (
                <tr
                  key={row.playerId}
                  className={`hover:bg-slate-800/40 transition ${
                    row.rank === 1 ? 'bg-amber-500/10 font-bold' : ''
                  }`}
                >
                  <td className="py-3.5 px-6 font-mono font-bold text-slate-200">
                    {row.rank === 1 && <span className="text-amber-400">🥇 1º Puesto</span>}
                    {row.rank === 2 && <span className="text-slate-300">🥈 2º Puesto</span>}
                    {row.rank === 3 && <span className="text-amber-600">🥉 3º Puesto</span>}
                    {row.rank > 3 && <span>{row.rank}º Puesto</span>}
                  </td>
                  <td className="py-3.5 px-6 font-bold text-white text-base">{row.fullName}</td>
                  <td className="py-3.5 px-6 text-center">
                    <span className="inline-block px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                      {row.score} pts
                    </span>
                  </td>
                  <td className="py-3.5 px-6 text-right font-mono font-bold text-amber-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      {row.totalTime.toFixed(3)}s
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center text-xs text-slate-500 pt-4">
        DocuQuiz Live • Resultados registrados en el cuaderno de estudio para consulta y evaluación
      </div>
    </div>
  );
};
