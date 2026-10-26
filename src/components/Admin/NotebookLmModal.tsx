import React, { useState } from 'react';
import { ExternalLink, Sparkles, BookOpen, Check, Copy, HelpCircle, X, Loader2 } from 'lucide-react';
import { api } from '../../services/api.ts';

interface Props {
  notebookId: string;
  isOpen: boolean;
  onClose: () => void;
  onSourceAdded: () => void;
}

export const NotebookLmModal: React.FC<Props> = ({
  notebookId,
  isOpen,
  onClose,
  onSourceAdded
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'guide' | 'sample'>('import');
  const [notebookUrl, setNotebookUrl] = useState<string>('');
  const [sourceName, setSourceName] = useState<string>('Guía de Estudio NotebookLM');
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setError('Por favor ingresa o pega el contenido de estudio de NotebookLM.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await api.addNotebookLmSource(notebookId, {
        name: sourceName.trim() || 'Guía de Estudio NotebookLM',
        content: content.trim(),
        notebookLmUrl: notebookUrl.trim() || undefined
      });
      onSourceAdded();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al conectar con NotebookLM');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadSample = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const sampleContent = `# GUÍA DE ESTUDIO EXPORTADA DE NOTEBOOKLM
Cuaderno de Origen: https://notebooklm.google.com/notebook/demo-bio

## 1. RESUMEN EJECUTIVO
El ciclo celular y la expresión genética constituyen los pilares del desarrollo biológico. La replicación semiconservativa del ADN garantiza la fidelidad en la transmisión de la información hereditaria, mientras que la mitosis asegura la distribución equitativa de los cromosomas hacia las células hijas.

## 2. CONCEPTOS CLAVE Y DEFINICIONES (Glosario de Fuentes)
- Mitocondria: Organelo eucariota transductor de energía mediante la cadena de transporte de electrones y fosforilación oxidativa. Posee membrana doble y genoma propio circular.
- Centrómero y Cinetocoro: Región cromosómica especializada donde se ensamblan los complejos proteicos que sirven de anclaje para los microtúbulos del huso mitótico durante la metafase y anafase.
- Alelos Codominantes: Variante génica donde ambos alelos de un heterocigoto se expresan plenamente en el fenotipo sin enmascararse mutuamente.
- Dogma Central de la Biología Molecular: Flujo unidireccional de información genética: ADN -> Transcripción -> ARN mensajero -> Traducción -> Proteína.

## 3. PREGUNTAS Y FOCOS DIDÁCTICOS RECOMENDADOS
- Diferenciar el rol de la ARN polimerasa vs la ADN polimerasa.
- Comprender la función catalítica de los ribosomas en el retículo endoplasmático rugoso.
- Analizar las consecuencias de las mutaciones puntuales sinónimas y no sinónimas en la secuencia codificante.`;

      await api.addNotebookLmSource(notebookId, {
        name: 'Guía de Estudio Demo (NotebookLM)',
        content: sampleContent,
        notebookLmUrl: 'https://notebooklm.google.com/notebook/demo-biologia'
      });
      onSourceAdded();
      onClose();
    } catch (err: unknown) {
      setError((err as Error).message || 'Error al cargar ejemplo de NotebookLM');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-violet-950/80 via-slate-900 to-indigo-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-lg shadow-violet-600/30">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white">Conexión con NotebookLM</h2>
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-mono font-bold border border-violet-500/30">
                  Google AI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Importa tus guías de estudio, resúmenes y notas de NotebookLM para generar quizzes interactivos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-slate-800/80 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('import')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-violet-500 text-violet-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Vincular Cuaderno y Notas</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-violet-500 text-violet-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>¿Cómo sincronizar?</span>
          </button>

          <button
            onClick={() => setActiveTab('sample')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'sample'
                ? 'border-violet-500 text-violet-300 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Cargar Ejemplo de NotebookLM</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
              {error}
            </div>
          )}

          {activeTab === 'import' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    Enlace de NotebookLM (Opcional)
                  </label>
                  <a
                    href="https://notebooklm.google.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-medium"
                  >
                    <span>Abrir Google NotebookLM</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <input
                  type="url"
                  value={notebookUrl}
                  onChange={(e) => setNotebookUrl(e.target.value)}
                  placeholder="https://notebooklm.google.com/notebook/..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Nombre o Título de la Fuente
                </label>
                <input
                  type="text"
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="Ej: Guía de Estudio: Biología Celular y Genética"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Contenido copiado de NotebookLM (Guía de Estudio, Resumen o Notas)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={8}
                  placeholder="Pega aquí el texto exportado de NotebookLM:
- Guía de estudio (Study Guide)
- Documento de información (Briefing Doc)
- Preguntas frecuentes o notas de investigación
Gemini lo usará para formular las preguntas y alternativas didácticas."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 resize-none leading-relaxed"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importando fuente...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Guardar como Fuente de NotebookLM</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-violet-600/30 text-violet-300 font-bold flex items-center justify-center text-xs">
                    1
                  </span>
                  Abre tu cuaderno en Google NotebookLM
                </h3>
                <p className="text-slate-400 pl-8">
                  Ingresa a <a href="https://notebooklm.google.com" target="_blank" rel="noopener noreferrer" className="text-violet-400 underline font-semibold">notebooklm.google.com</a> con tu cuenta de Google y selecciona tu cuaderno con tus fuentes cargadas (Google Docs, PDFs, YouTube o enlaces).
                </p>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-violet-600/30 text-violet-300 font-bold flex items-center justify-center text-xs">
                    2
                  </span>
                  Genera una Guía de Estudio o Resumen en NotebookLM
                </h3>
                <p className="text-slate-400 pl-8">
                  En el panel central "Guía del cuaderno" (Notebook Guide), haz clic en el botón <strong>"Guía de estudio" (Study Guide)</strong> o <strong>"Documento de información" (Briefing Doc)</strong>. NotebookLM sintetizará todas las fuentes con definiciones, conceptos clave y cronologías.
                </p>
              </div>

              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-violet-600/30 text-violet-300 font-bold flex items-center justify-center text-xs">
                    3
                  </span>
                  Copia y pega en DocuQuiz Live
                </h3>
                <p className="text-slate-400 pl-8">
                  Copia el texto generado y pégalo en la pestaña "Vincular Cuaderno y Notas". Al guardarlo, nuestro motor de Gemini creará un cuestionario en tiempo real con 4 alternativas y la retroalimentación pedagógica basada en NotebookLM para jugar al estilo Kahoot en tu aula.
                </p>
              </div>

              <div className="pt-2 flex justify-center">
                <button
                  onClick={() => setActiveTab('import')}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition"
                >
                  Entendido, vincular mis notas ahora
                </button>
              </div>
            </div>
          )}

          {activeTab === 'sample' && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-violet-600/20 text-violet-400 flex items-center justify-center border border-violet-500/30">
                <BookOpen className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Importar Ejemplo Listo de NotebookLM</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  ¿Quieres probar la funcionalidad de inmediato sin ir a NotebookLM? Carga este ejemplo prediseñado de Guía de Estudio con conceptos de biología celular.
                </p>
              </div>

              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-violet-600/30 transition inline-flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cargando ejemplo...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Cargar Guía de Estudio de NotebookLM (1 Clic)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
