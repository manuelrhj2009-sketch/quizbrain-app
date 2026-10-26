import React, { useState } from 'react';
import { Smartphone, User, ArrowRight, Sparkles, Hash } from 'lucide-react';

interface Props {
  initialRoomCode?: string;
  onJoin: (roomCode: string, firstName: string, lastName: string) => void;
  error?: string | null;
  loading?: boolean;
}

export const PlayerLogin: React.FC<Props> = ({
  initialRoomCode = '',
  onJoin,
  error,
  loading = false
}) => {
  const [roomCode, setRoomCode] = useState<string>(initialRoomCode);
  const [lastName, setLastName] = useState<string>(''); // Apellido (Obligatorio)
  const [firstName, setFirstName] = useState<string>(''); // Nombre (Obligatorio)
  const [formError, setFormError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialRoomCode) {
      setRoomCode(initialRoomCode);
    }
  }, [initialRoomCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanCode = roomCode.trim().replace(/\s+/g, '').toUpperCase();
    const cleanLast = lastName.trim();
    const cleanFirst = firstName.trim();

    if (!cleanCode) {
      setFormError('Por favor ingresa el código PIN de la sala.');
      return;
    }

    if (!cleanLast || !cleanFirst) {
      setFormError('Es obligatorio ingresar tanto tu Apellido como tu Nombre.');
      return;
    }

    onJoin(cleanCode, cleanFirst, cleanLast);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-600/15 rounded-full blur-2xl pointer-events-none" />

        {/* Brand */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-2xl mx-auto flex items-center justify-center text-white shadow-xl shadow-indigo-600/30">
            <Smartphone className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">DocuQuiz Live</h1>
          <p className="text-xs text-indigo-300 font-medium">Control Remoto del Alumno</p>
        </div>

        {/* Form Error or Socket Error */}
        {(formError || error) && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 text-center font-medium animate-shake">
            {formError || error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Código PIN de la Sala
            </label>
            <div className="relative">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Ej: 582910"
                maxLength={8}
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-lg font-mono font-bold text-white tracking-widest text-center focus:outline-none focus:border-indigo-500"
                required
              />
              <Hash className="w-5 h-5 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Apellido <span className="text-rose-400">* Obligatorio</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Ej: Morales"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Nombre <span className="text-rose-400">* Obligatorio</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ej: Carlos"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                required
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Conectando...' : 'Unirse a la Partida'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-500 mt-5">
          Tus respuestas se sincronizarán en tiempo real con la pantalla del proyector.
        </p>
      </div>
    </div>
  );
};
