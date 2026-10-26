import React, { useState } from 'react';
import { Sparkles, Loader2, X, Clock, BookOpen, MessageSquareQuote, CheckCircle2 } from 'lucide-react';
import { Notebook, Quiz } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface Props {
  notebook: Notebook;
  isOpen: boolean;
  onClose: () => void;
  onQuizGenerated: (quiz: Quiz) => void;
}

export const QuizGeneratorModal: React.FC<Props> = ({
  notebook,
  isOpen,
  onClose,
  onQuizGenerated
}) => {
  const hasSources = (notebook.sources || []).length > 0;

  const [generationMode, setGenerationMode] = useState<'sources' | 'prompt'>(hasSources ? 'sources' : 'prompt');
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [timePerQuestion, setTimePerQuestion] = useState<number>(15);
  const [isCustomTime, setIsCustomTime] = useState<boolean>(false);
  const [customTimeInput, setCustomTimeInput] = useState<string>('20');
  const [complexity, setComplexity] = useState<'Fácil' | 'Medio' | 'Difícil'>('Medio');
  const [customTopic, setCustomTopic] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isPromptOnly = generationMode === 'prompt' || !hasSources;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPromptOnly && !customTopic.trim()) {
      setError('Por favor escribe el tema o prompt sobre el cual deseas que la IA formule las preguntas.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const generatedQuiz = await api.generateQuizWithAI(notebook.id, {
        numQuestions,
        timePerQuestion,
        complexity,
        customTopic: customTopic.trim() || undefined,
        usePromptOnly: isPromptOnly
      });
      onQuizGenerated(generatedQuiz);
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al comunicarse con la IA de Gemini');
    } finally {
      setLoading(false);
    }
  };

  const isSubmitDisabled = loading || (isPromptOnly && !customTopic.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-indigo-950/70 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-6 h-6 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Generador de Cuestionarios con IA</h2>
              <p className="text-xs text-indigo-200/70">Potenciado por Gemini 3.8 Flash</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleGenerate} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 text-sm bg-rose-950/50 border border-rose-700/50 rounded-xl text-rose-300">
              {error}
            </div>
          )}

          {/* Mode Selector: Fuentes vs Prompt libre */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Modo de Generación
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setGenerationMode('sources')}
                disabled={!hasSources}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
                  generationMode === 'sources' && hasSources
                    ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                    : hasSources
                    ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200 cursor-pointer'
                    : 'bg-slate-900/40 border-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                <BookOpen className={`w-4 h-4 mt-0.5 shrink-0 ${generationMode === 'sources' && hasSources ? 'text-indigo-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs font-bold leading-tight">Basado en Fuentes</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {hasSources ? `${notebook.sources.length} documento(s) cargado(s)` : 'No hay fuentes en este cuaderno'}
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setGenerationMode('prompt')}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-2.5 cursor-pointer ${
                  generationMode === 'prompt' || !hasSources
                    ? 'bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border-violet-500 text-white shadow-md'
                    : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <MessageSquareQuote className={`w-4 h-4 mt-0.5 shrink-0 ${(generationMode === 'prompt' || !hasSources) ? 'text-violet-400' : 'text-slate-500'}`} />
                <div>
                  <div className="text-xs font-bold leading-tight">Tema Libre con Prompt</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Sin fuentes previas (IA pura)
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Prompt / Topic Input */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                {isPromptOnly ? 'Tema o Prompt del Cuestionario *' : 'Enfoque o tema específico (Opcional)'}
              </label>
              {isPromptOnly && (
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">
                  Requerido
                </span>
              )}
            </div>
            <textarea
              rows={2}
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder={
                isPromptOnly
                  ? 'Ej: Formular preguntas sobre Leyes de Newton, Dinámica y Fuerza de Gravedad para nivel secundario...'
                  : 'Ej: Fases de la mitosis, Leyes de Mendel, síntesis de proteínas...'
              }
              className={`w-full px-3.5 py-2.5 bg-slate-800 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 ${
                isPromptOnly && !customTopic.trim()
                  ? 'border-violet-500/60 focus:border-violet-500 focus:ring-violet-500'
                  : 'border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'
              }`}
            />
            {isPromptOnly && (
              <p className="text-[11px] text-violet-300/80 mt-1">
                La IA de Gemini formulará el cuestionario completo directamente a partir de las instrucciones o tema que indiques aquí, sin necesidad de adjuntar archivos.
              </p>
            )}
          </div>

          {/* Number of Questions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Cantidad de Preguntas
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[3, 5, 8, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNumQuestions(num)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition border cursor-pointer ${
                    numQuestions === num
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {num} preguntas
                </button>
              ))}
            </div>
          </div>

          {/* Time per question: 10s to 30s presets + custom manual input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                Tiempo por Pregunta
              </label>
              <span className="text-xs text-amber-400 font-mono font-medium">
                {timePerQuestion} segundos
              </span>
            </div>

            {/* Presets: 10, 15, 20, 25, 30 seconds */}
            <div className="grid grid-cols-5 gap-2 mb-2.5">
              {[10, 15, 20, 25, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => {
                    setTimePerQuestion(sec);
                    setIsCustomTime(false);
                  }}
                  className={`py-2 px-2 rounded-xl text-xs font-bold flex flex-col items-center justify-center transition border cursor-pointer ${
                    !isCustomTime && timePerQuestion === sec
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  <span className="text-sm font-extrabold">{sec}s</span>
                  <span className="text-[10px] text-slate-400 font-normal">seg</span>
                </button>
              ))}
            </div>

            {/* Manual Custom Time Option */}
            <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/70 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsCustomTime(true);
                  const parsed = parseInt(customTimeInput, 10);
                  if (!isNaN(parsed) && parsed >= 5 && parsed <= 180) {
                    setTimePerQuestion(parsed);
                  }
                }}
                className={`text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                  isCustomTime ? 'text-amber-300' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className={`w-3 h-3 rounded-full border flex items-center justify-center ${isCustomTime ? 'border-amber-400 bg-amber-400' : 'border-slate-500'}`} />
                <span>Tiempo Manual Personalizado:</span>
              </button>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={customTimeInput}
                  onChange={(e) => {
                    setCustomTimeInput(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 5 && val <= 180) {
                      setTimePerQuestion(val);
                      setIsCustomTime(true);
                    }
                  }}
                  onFocus={() => setIsCustomTime(true)}
                  placeholder="ej. 18"
                  className="w-20 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-center text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-400">segundos</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Este tiempo se asignará automáticamente a todas las preguntas, y luego podrás cambiar manualmente el tiempo de cada pregunta si lo necesitas.
            </p>
          </div>

          {/* Complexity Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Nivel de Complejidad
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['Fácil', 'Medio', 'Difícil'] as const).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setComplexity(lvl)}
                  className={`py-2.5 rounded-xl text-sm font-semibold transition border cursor-pointer ${
                    complexity === lvl
                      ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generando preguntas con Gemini 3.8 Flash...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>
                    Generar {numQuestions} Preguntas con IA {isPromptOnly ? '(por Prompt)' : '(de Fuentes)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
