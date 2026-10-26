import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Users,
  Play,
  Volume2,
  VolumeX,
  Sparkles,
  Smartphone,
  ArrowLeft,
  Copy,
  Check,
  Link,
  Share2,
  AlertTriangle,
  HelpCircle,
  Globe,
  Settings2,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { GameRoomState, Player } from '../../types/index.ts';
import { SoundEffects } from '../../services/sound.ts';

interface Props {
  roomState: GameRoomState;
  onStartGame: () => void;
  onExit: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const ProjectorLobby: React.FC<Props> = ({
  roomState,
  onStartGame,
  onExit,
  soundEnabled,
  onToggleSound
}) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Detect current domain
  const rawOrigin = typeof window !== 'undefined' ? window.location.origin : '';
  const isDevOrigin = rawOrigin.includes('ais-dev-');

  // Convert ais-dev to public ais-pre
  const publicSharedOrigin = isDevOrigin
    ? rawOrigin.replace('ais-dev-', 'ais-pre-')
    : rawOrigin;

  // Selected URL mode: default to publicSharedOrigin if in dev
  const [urlMode, setUrlMode] = useState<'public' | 'dev' | 'custom'>(
    isDevOrigin ? 'public' : 'dev'
  );
  const [customOrigin, setCustomOrigin] = useState<string>('');

  const activeOrigin =
    urlMode === 'public'
      ? publicSharedOrigin
      : urlMode === 'custom' && customOrigin.trim()
      ? customOrigin.trim().replace(/\/$/, '')
      : rawOrigin;

  // Direct join URL for students with pin prefilled
  const joinUrl = activeOrigin
    ? `${activeOrigin}/?pin=${roomState.roomCode}&role=player`
    : `/?pin=${roomState.roomCode}&role=player`;

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(joinUrl);
        setCopiedLink(true);
        SoundEffects.playTap();
        setTimeout(() => setCopiedLink(false), 3000);
      }
    } catch {
      // Fallback
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Únete a ${roomState.quizTitle}`,
          text: `Ingresa al cuestionario interactivo con el PIN ${roomState.roomCode}:`,
          url: joinUrl
        });
      } catch {}
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-10 select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Bar */}
      <div className="relative z-10 flex items-center justify-between border-b border-slate-800/80 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onExit}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl border border-slate-800 transition cursor-pointer"
            title="Salir al panel"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30">
                SALA DE PROYECCIÓN
              </span>
              <span className="text-xs text-slate-400">
                {roomState.totalQuestions} Preguntas • {roomState.timePerQuestion}s por turno
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">{roomState.quizTitle}</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Help button for student connection errors */}
          <button
            onClick={() => setShowHelpModal(true)}
            className="px-3 py-2 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-xl transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
            title="Ayuda para alumnos con error de acceso o cuenta institucional"
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">¿Alumnos con error de cuenta?</span>
          </button>

          <button
            onClick={onToggleSound}
            className={`p-3 rounded-xl border transition flex items-center gap-2 text-xs font-bold cursor-pointer ${
              soundEnabled
                ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-rose-400" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Sonido Activo' : 'Silenciado'}</span>
          </button>

          <button
            onClick={() => {
              SoundEffects.playTap();
              onStartGame();
            }}
            disabled={roomState.playersCount === 0}
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transform active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Iniciar Cuestionario</span>
          </button>
        </div>
      </div>

      {/* Main Center Area: Giant PIN & QR Code */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-6 items-center">
        {/* Left: Join Instructions and QR Code */}
        <div className="lg:col-span-5 flex flex-col items-center text-center p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-2">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Únete desde cualquier smartphone o tablet</span>
          </div>

          <h2 className="text-sm font-semibold text-slate-300 mb-1">
            Escanea el código QR o entra con el enlace
          </h2>

          <div className="p-4 bg-white rounded-2xl shadow-xl my-3 inline-block relative group">
            <QRCodeSVG
              value={joinUrl}
              size={195}
              level="H"
              includeMargin={false}
            />
          </div>

          {/* Direct Link + One-Click Copy */}
          <div className="w-full space-y-2">
            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 text-left">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                <span className="flex items-center gap-1 font-semibold text-slate-300">
                  <Link className="w-3 h-3 text-indigo-400" />
                  Enlace de acceso para los alumnos:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                    title="Configurar enlace de acceso"
                  >
                    <Settings2 className="w-3 h-3" />
                    Cambiar enlace
                  </button>
                </div>
              </div>
              <div className="font-mono text-indigo-300 select-all font-semibold text-[11px] break-all bg-slate-900/80 p-2 rounded-xl border border-slate-800">
                {joinUrl}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                  copiedLink
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                }`}
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? '¡Enlace de acceso copiado!' : 'Copiar enlace de acceso'}</span>
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
                title="Compartir enlace de la sala"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Warning Alert if running on dev URL */}
            {isDevOrigin && (
              <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-2xl text-left space-y-1.5 animate-in fade-in">
                <div className="flex items-start justify-between gap-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>¿Error "Cuenta gestionada por administrador"?</span>
                  </div>
                  <button
                    onClick={() => setShowHelpModal(true)}
                    className="text-[10px] text-amber-300 hover:underline font-bold shrink-0 cursor-pointer"
                  >
                    Ver solución →
                  </button>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-tight">
                  Las cuentas institucionales de Google de los alumnos suelen bloquear enlaces privados de desarrollo (<strong>ais-dev</strong>). Para que ingresen sin bloqueos:
                </p>
                <ul className="text-[10px] text-amber-300/90 list-disc list-inside space-y-0.5 pl-1">
                  <li>
                    Haz clic en el botón <strong>"Share" (Compartir)</strong> en la barra superior de AI Studio para activar la URL pública (<strong>ais-pre</strong>).
                  </li>
                  <li>
                    O pide a los alumnos abrir el link en una <strong>Ventana de Incógnito</strong> o navegador personal.
                  </li>
                </ul>
                <div className="pt-1.5">
                  <a
                    href={`${publicSharedOrigin}/?role=projector&quizId=${roomState.quizId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition transform active:scale-95 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir Proyector en URL Pública (ais-pre)</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Giant Room PIN & Live Connected Students */}
        <div className="lg:col-span-7 space-y-6">
          <div className="p-8 bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border-2 border-indigo-500/40 rounded-3xl shadow-2xl text-center">
            <span className="text-xs font-bold tracking-widest uppercase text-indigo-300 block mb-1">
              CÓDIGO PIN DE LA SALA
            </span>
            <div className="text-6xl sm:text-8xl font-black tracking-widest text-white font-mono drop-shadow-[0_4px_25px_rgba(99,102,241,0.5)]">
              {roomState.roomCode}
            </div>
            <p className="text-sm text-indigo-200/70 mt-2">
              Ingresa obligatoriamente con tu <strong className="text-white">Apellido y Nombre</strong>
            </p>
          </div>

          {/* Connected Students Counter & Name Bubbles */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">
                  Alumnos Conectados ({roomState.playersCount})
                </h3>
              </div>
              {roomState.playersCount === 0 && (
                <span className="text-xs text-amber-400 animate-pulse font-medium">
                  Esperando a que los alumnos se unan...
                </span>
              )}
            </div>

            {roomState.playersCount === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm border border-dashed border-slate-800 rounded-2xl">
                Los nombres de los estudiantes aparecerán aquí en tiempo real al escanear el QR o abrir el enlace.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2.5 max-h-56 overflow-y-auto p-1">
                {roomState.players.map((player: Player) => (
                  <div
                    key={player.id}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-900/50 to-slate-800 border border-indigo-500/30 rounded-xl text-sm font-bold text-white flex items-center gap-2 shadow-md animate-fade-in"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>{player.fullName}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar Footer */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 border-t border-slate-900 pt-4 gap-2">
        <span>DocuQuiz Live • Proyección de Aula</span>
        <span>Presiona "Iniciar Cuestionario" cuando todos los alumnos estén conectados.</span>
      </div>

      {/* Modal: Ayuda y Solución para Error "Cuenta gestionada por administrador" */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">¿Por qué sale el error de cuenta administrada?</h3>
                  <p className="text-xs text-slate-400">Solución paso a paso para que los alumnos ingresen sin problemas</p>
                </div>
              </div>
              <button
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <span className="font-bold text-amber-400 uppercase tracking-wider text-[11px] block">
                  Causa del problema
                </span>
                <p>
                  Cuando proyectas desde Google AI Studio en modo edición, la URL comienza con <code className="text-indigo-300 font-mono bg-slate-900 px-1 py-0.5 rounded">ais-dev-...</code> (enlace privado de desarrollo protegido por Google).
                </p>
                <p>
                  Si los alumnos intentan abrir ese enlace y tienen iniciada su cuenta de Google del colegio/institución (<strong>Google Workspace for Education</strong>), las políticas de seguridad de su colegio les muestran el mensaje: <em className="text-rose-300 font-semibold">"No tienes acceso a esta página. Tu cuenta la gestiona el administrador."</em>
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-black text-white text-sm">3 Soluciones Inmediatas:</h4>

                {/* Solución 1 */}
                <div className="p-3.5 bg-emerald-950/40 border border-emerald-700/60 rounded-xl space-y-1">
                  <span className="font-bold text-emerald-300 block">
                    1. Publicar el enlace público con el botón "Share" (Recomendado)
                  </span>
                  <p className="text-slate-300 text-[11px]">
                    En la esquina superior derecha de AI Studio, presiona el botón <strong>"Share" (Compartir)</strong>. Esto publica la versión pública (que comienza con <code className="text-emerald-300 font-mono">ais-pre-...</code>), la cual permite que cualquier estudiante ingrese sin requerir permisos de Google.
                  </p>
                </div>

                {/* Solución 2 */}
                <div className="p-3.5 bg-indigo-950/40 border border-indigo-700/60 rounded-xl space-y-1">
                  <span className="font-bold text-indigo-300 block">
                    2. Abrir en "Ventana de Incógnito" o navegador personal en el celular
                  </span>
                  <p className="text-slate-300 text-[11px]">
                    Indica a los alumnos que abran el enlace en una <strong>pestaña de incógnito/privada</strong> o desde un navegador donde no tengan su correo institucional de Google. <strong>DocuQuiz Live no requiere ninguna cuenta de Google</strong>, los alumnos solo necesitan ingresar su Apellido y Nombre.
                  </p>
                </div>

                {/* Solución 3 */}
                <div className="p-3.5 bg-slate-800/80 border border-slate-700 rounded-xl space-y-1">
                  <span className="font-bold text-slate-200 block">
                    3. Cambiar al modo de enlace público (ais-pre) aquí en el proyector
                  </span>
                  <p className="text-slate-300 text-[11px]">
                    Haz clic en "Cambiar enlace" en el proyector y selecciona la opción de <strong>URL Pública (ais-pre)</strong>. El QR se actualizará automáticamente.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Entendido, cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configurar Enlace de Acceso */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Configurar Enlace de Alumnos</h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Elige cuál enlace se codificará en el código QR y en el botón de copiar:
            </p>

            <div className="space-y-3">
              {/* Option: Public ais-pre */}
              <div
                onClick={() => setUrlMode('public')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  urlMode === 'public'
                    ? 'bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${urlMode === 'public' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">URL Pública Compartida (Recomendada)</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">ais-pre</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono break-all">
                    {publicSharedOrigin}
                  </p>
                  <p className="text-[10px] text-emerald-400 mt-1">
                    Permite que los alumnos ingresen sin bloqueos de cuenta de Google ni permisos de administrador. (Requiere haber presionado "Share" en AI Studio).
                  </p>
                </div>
              </div>

              {/* Option: Current ais-dev */}
              <div
                onClick={() => setUrlMode('dev')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  urlMode === 'dev'
                    ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${urlMode === 'dev' ? 'border-indigo-400 bg-indigo-400' : 'border-slate-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">URL Actual del Navegador</span>
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-bold">ais-dev</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono break-all">
                    {rawOrigin}
                  </p>
                </div>
              </div>

              {/* Option: Custom URL */}
              <div
                onClick={() => setUrlMode('custom')}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                  urlMode === 'custom'
                    ? 'bg-violet-950/40 border-violet-500 ring-1 ring-violet-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className={`w-4 h-4 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${urlMode === 'custom' ? 'border-violet-400 bg-violet-400' : 'border-slate-600'}`} />
                <div className="flex-1 space-y-2">
                  <span className="text-xs font-bold text-white">Dominio o URL Personalizada</span>
                  <input
                    type="url"
                    value={customOrigin}
                    onChange={(e) => {
                      setCustomOrigin(e.target.value);
                      setUrlMode('custom');
                    }}
                    placeholder="https://mi-dominio.com o https://..."
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Aplicar al Código QR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
