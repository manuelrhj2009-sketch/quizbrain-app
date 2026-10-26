import React, { useState } from 'react';
import { BookOpen, Plus, FileText, CheckCircle, Sparkles, Trash2, ArrowRight } from 'lucide-react';
import { Notebook, Quiz } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface Props {
  notebooks: Notebook[];
  onSelectNotebook: (notebook: Notebook) => void;
  onRefresh: () => void;
  onLaunchQuiz: (quiz: Quiz) => void;
}

export const AdminDashboard: React.FC<Props> = ({
  notebooks,
  onSelectNotebook,
  onRefresh,
  onLaunchQuiz
}) => {
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateNotebook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    setErrorMessage(null);
    try {
      const created = await api.createNotebook(newTitle, newDesc);
      setNewTitle('');
      setNewDesc('');
      setShowCreateModal(false);
      onRefresh();
      onSelectNotebook(created);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Error al crear cuaderno');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!notebookToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteNotebook(notebookToDelete.id);
      setNotebookToDelete(null);
      onRefresh();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Error al eliminar cuaderno');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-900/40 p-8 sm:p-10 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 text-xs font-semibold border border-indigo-500/20">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Motor Inteligente con Gemini 3.8 Flash & Socket.io</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Cuestionarios en Vivo Basados en Documentos
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Sube tus fuentes de información (PDF, Word o texto estilo NotebookLM), genera automáticamente preguntas con alternativas y retroalimentación didáctica, y proyéctalas en pantalla grande con control táctil para los alumnos en sus celulares.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Nuevo Cuaderno</span>
            </button>
          </div>
        </div>
      </div>

      {/* Cuadernos Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-400" />
              <span>Mis Cuadernos de Estudio</span>
            </h2>
            <p className="text-xs text-slate-400">
              Cada cuaderno almacena fuentes documentales, cuestionarios aprobados y rankings históricos.
            </p>
          </div>
        </div>

        {notebooks.length === 0 ? (
          <div className="text-center py-16 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
            <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-300">No hay cuadernos creados aún</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Crea tu primer cuaderno para organizar tus documentos de clase y generar cuestionarios interactivos.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md transition"
            >
              Crear primer cuaderno
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {notebooks.map((nb) => {
              const approvedQuizzes = (nb.quizzes || []).filter((q) => q.approved);

              return (
                <div
                  key={nb.id}
                  onClick={() => onSelectNotebook(nb)}
                  className="group relative p-6 bg-slate-900/80 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl transition shadow-lg cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="p-2.5 bg-indigo-600/15 text-indigo-400 rounded-xl border border-indigo-500/20 group-hover:scale-110 transition duration-300">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotebookToDelete(nb);
                        }}
                        className="text-slate-600 hover:text-rose-400 p-1.5 rounded-lg transition opacity-60 group-hover:opacity-100 hover:bg-slate-800"
                        title="Eliminar cuaderno"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition mb-1">
                      {nb.title}
                    </h3>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">
                      {nb.description || 'Sin descripción.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800/80 mb-4 font-mono">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>{nb.sources?.length || 0} fuentes</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{approvedQuizzes.length} aprobados</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-indigo-400 pt-3 border-t border-slate-800/80 group-hover:text-indigo-300">
                    <span>Abrir cuaderno y gestionar</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Create Notebook */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Nuevo Cuaderno de Estudio</h3>
            <form onSubmit={handleCreateNotebook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Título del Cuaderno
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Historia Universal: La Guerra Fría"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Descripción (Opcional)
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="Breve detalle sobre la asignatura o tema..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition disabled:opacity-50"
                >
                  {isCreating ? 'Creando...' : 'Crear Cuaderno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Notebook */}
      {notebookToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar cuaderno de estudio?</h3>
                <p className="text-xs text-slate-400">Se eliminarán todas las fuentes, cuestionarios y rankings.</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
              <span className="text-slate-500 block mb-0.5">Cuaderno a borrar:</span>
              <strong className="text-white text-sm">{notebookToDelete.title}</strong>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setNotebookToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, eliminar cuaderno'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
