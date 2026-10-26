import React from 'react';
import { BookOpen, Smartphone, MonitorPlay, Sparkles } from 'lucide-react';

interface Props {
  currentRole: 'admin' | 'projector' | 'player';
  onChangeRole: (role: 'admin' | 'projector' | 'player') => void;
  activeRoomCode?: string | null;
}

export const AdminNavbar: React.FC<Props> = ({
  currentRole,
  onChangeRole,
  activeRoomCode
}) => {
  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / Brand */}
        <div
          onClick={() => onChangeRole('admin')}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-black tracking-tight text-white">DocuQuiz</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              NotebookLM + Kahoot con IA
            </p>
          </div>
        </div>

        {/* Role Switcher & Public Link */}
        <div className="flex items-center gap-2">
          {typeof window !== 'undefined' && window.location.origin.includes('ais-dev-') && (
            <a
              href={window.location.origin.replace('ais-dev-', 'ais-pre-')}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
              title="Abrir aplicación en la URL pública accesible para alumnos externos"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="hidden md:inline">URL Pública Alumnos</span>
            </a>
          )}

          <div className="flex items-center p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => onChangeRole('admin')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                currentRole === 'admin'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Panel Admin</span>
            </button>

            <button
              onClick={() => onChangeRole('player')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                currentRole === 'player'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Vista Alumno</span>
              {activeRoomCode && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
