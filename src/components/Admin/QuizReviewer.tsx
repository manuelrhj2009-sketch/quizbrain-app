import React, { useState } from 'react';
import { Check, CheckCircle2, Trash2, Plus, ArrowLeft, Clock, ShieldCheck, HelpCircle } from 'lucide-react';
import { Quiz, Question, SUIT_DEFINITIONS } from '../../types/index.ts';
import { api } from '../../services/api.ts';

interface Props {
  quiz: Quiz;
  notebookTitle: string;
  onBack: () => void;
  onQuizApproved: (approvedQuiz: Quiz) => void;
}

export const QuizReviewer: React.FC<Props> = ({
  quiz: initialQuiz,
  notebookTitle,
  onBack,
  onQuizApproved
}) => {
  const [quiz, setQuiz] = useState<Quiz>(initialQuiz);
  const [selectedQIndex, setSelectedQIndex] = useState<number>(0);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const currentQ = quiz.questions[selectedQIndex];

  const handleUpdateQuestionText = (text: string) => {
    const updated = [...quiz.questions];
    updated[selectedQIndex] = { ...updated[selectedQIndex], text };
    setQuiz({ ...quiz, questions: updated });
  };

  const handleUpdateOptionText = (optIndex: number, text: string) => {
    const updated = [...quiz.questions];
    const targetQ = { ...updated[selectedQIndex] };
    const newOptions = [...targetQ.options] as [any, any, any, any];
    newOptions[optIndex] = { ...newOptions[optIndex], text };
    targetQ.options = newOptions;
    updated[selectedQIndex] = targetQ;
    setQuiz({ ...quiz, questions: updated });
  };

  const handleSetCorrectOption = (optIndex: number) => {
    const updated = [...quiz.questions];
    updated[selectedQIndex] = {
      ...updated[selectedQIndex],
      correctOptionIndex: optIndex
    };
    setQuiz({ ...quiz, questions: updated });
  };

  const handleUpdateFeedback = (feedback: string) => {
    const updated = [...quiz.questions];
    updated[selectedQIndex] = { ...updated[selectedQIndex], feedback };
    setQuiz({ ...quiz, questions: updated });
  };

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleUpdateQuestionDuration = (seconds: number) => {
    const val = Math.max(5, Math.min(180, seconds));
    const updated = [...quiz.questions];
    updated[selectedQIndex] = { ...updated[selectedQIndex], timePerQuestion: val };
    setQuiz({ ...quiz, questions: updated });
  };

  const handleApplyDurationToAll = (seconds: number) => {
    const val = Math.max(5, Math.min(180, seconds));
    const updated = quiz.questions.map((q) => ({
      ...q,
      timePerQuestion: val
    }));
    setQuiz({ ...quiz, timePerQuestion: val, questions: updated });
  };

  const handleDeleteQuestion = (idx: number) => {
    if (quiz.questions.length <= 1) {
      setErrorMessage('El cuestionario debe tener al menos 1 pregunta.');
      return;
    }
    const updated = quiz.questions.filter((_, i) => i !== idx);
    setQuiz({ ...quiz, questions: updated });
    if (selectedQIndex >= updated.length) {
      setSelectedQIndex(updated.length - 1);
    }
  };

  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-${Date.now()}-${quiz.questions.length + 1}`,
      text: 'Nueva pregunta...',
      options: [
        { id: '0', text: 'Opción 1', suit: 'hearts', color: 'red', symbol: '♥', colorName: 'Rojo' },
        { id: '1', text: 'Opción 2', suit: 'diamonds', color: 'blue', symbol: '♦', colorName: 'Azul' },
        { id: '2', text: 'Opción 3', suit: 'clubs', color: 'yellow', symbol: '♣', colorName: 'Amarillo' },
        { id: '3', text: 'Opción 4', suit: 'spades', color: 'green', symbol: '♠', colorName: 'Verde' }
      ],
      correctOptionIndex: 0,
      feedback: 'Retroalimentación didáctica para explicar la respuesta.',
      timePerQuestion: quiz.timePerQuestion || 15
    };
    const updated = [...quiz.questions, newQ];
    setQuiz({ ...quiz, questions: updated });
    setSelectedQIndex(updated.length - 1);
  };

  const handleApproveQuiz = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const approved: Quiz = {
        ...quiz,
        approved: true
      };
      const saved = await api.saveQuiz(quiz.notebookId, approved);
      setSavedSuccess(true);
      setTimeout(() => {
        onQuizApproved(saved);
      }, 600);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Error al guardar cuestionario');
      setIsSaving(false);
    }
  };

  const [showGlobalTimeDropdown, setShowGlobalTimeDropdown] = useState<boolean>(false);
  const [manualGlobalInput, setManualGlobalInput] = useState<string>(String(quiz.timePerQuestion || 15));

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-slate-900/90 border border-slate-800 rounded-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-medium border border-indigo-500/30">
                Revisión de Cuestionario
              </span>
              <span className="text-xs text-slate-400">Cuaderno: {notebookTitle}</span>
            </div>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              className="mt-1 text-xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Global Duration Configurator */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowGlobalTimeDropdown(!showGlobalTimeDropdown)}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs text-slate-200 border border-slate-700 transition"
            >
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Tiempo general: <strong>{quiz.timePerQuestion}s</strong></span>
              <span className="text-slate-400 text-[10px]">▼</span>
            </button>

            {showGlobalTimeDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-30 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-white border-b border-slate-800 pb-2">
                  <span>Tiempo General por Pregunta</span>
                  <button
                    onClick={() => setShowGlobalTimeDropdown(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-5 gap-1.5">
                  {[10, 15, 20, 25, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setManualGlobalInput(String(sec));
                        handleApplyDurationToAll(sec);
                      }}
                      className={`py-1.5 text-xs font-bold rounded-lg border transition ${
                        quiz.timePerQuestion === sec
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                {/* Manual input */}
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <span className="text-xs text-slate-400 whitespace-nowrap">Manual:</span>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={manualGlobalInput}
                    onChange={(e) => setManualGlobalInput(e.target.value)}
                    className="w-16 px-2 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center text-xs"
                    placeholder="seg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const val = parseInt(manualGlobalInput, 10);
                      if (!isNaN(val) && val >= 5) {
                        handleApplyDurationToAll(val);
                      }
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-lg transition"
                  >
                    Aplicar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    handleApplyDurationToAll(quiz.timePerQuestion);
                    setShowGlobalTimeDropdown(false);
                  }}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-lg border border-amber-500/30 transition text-center"
                >
                  ⚡ Aplicar {quiz.timePerQuestion}s a todas las preguntas
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleApproveQuiz}
            disabled={isSaving}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
          >
            {savedSuccess ? (
              <>
                <Check className="w-5 h-5 text-white" />
                <span>¡Cuestionario Aprobado!</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5" />
                <span>Aprobar Cuestionario</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-950/70 border border-rose-800 rounded-2xl text-xs text-rose-300 flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white text-xs font-bold">
            Descartar
          </button>
        </div>
      )}

      {/* Main Review Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Questions Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Preguntas ({quiz.questions.length})
            </h3>
            <button
              onClick={handleAddQuestion}
              className="text-xs flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Nueva
            </button>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {quiz.questions.map((q, idx) => {
              const qDuration = q.timePerQuestion || quiz.timePerQuestion || 15;
              const isCustom = q.timePerQuestion !== undefined && q.timePerQuestion !== quiz.timePerQuestion;

              return (
                <div
                  key={q.id || idx}
                  onClick={() => setSelectedQIndex(idx)}
                  className={`p-3 rounded-xl border cursor-pointer transition text-left flex items-start justify-between gap-2 ${
                    selectedQIndex === idx
                      ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-md'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    <span
                      className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${
                        selectedQIndex === idx
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium line-clamp-2">{q.text || 'Sin enunciado'}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isCustom
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}>
                          <Clock className="w-2.5 h-2.5" />
                          {qDuration}s
                        </span>
                        {isCustom && (
                          <span className="text-[9px] text-amber-400 font-medium">(manual)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteQuestion(idx);
                    }}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Eliminar pregunta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Question Editor Pane */}
        {currentQ && (
          <div className="lg:col-span-8 space-y-5 bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-indigo-600 text-white text-xs font-bold rounded-lg">
                  Pregunta {selectedQIndex + 1} de {quiz.questions.length}
                </span>
                <span className="text-xs text-slate-400">
                  Haz clic en el círculo para fijar la respuesta correcta.
                </span>
              </div>

              {/* Per-question manual duration selector */}
              <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tiempo:</span>
                </span>

                <div className="flex items-center gap-1">
                  {[10, 15, 20, 25, 30].map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => handleUpdateQuestionDuration(sec)}
                      className={`px-2 py-1 rounded text-xs font-bold transition border ${
                        (currentQ.timePerQuestion || quiz.timePerQuestion) === sec
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {sec}s
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 pl-1 border-l border-slate-800">
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={currentQ.timePerQuestion || quiz.timePerQuestion || 15}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 5) {
                        handleUpdateQuestionDuration(val);
                      }
                    }}
                    className="w-14 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-center text-xs text-white font-mono"
                    title="Ingresar segundos manualmente"
                  />
                  <span className="text-[11px] text-slate-400">s</span>
                </div>
              </div>
            </div>

            {/* Question Text Field */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Enunciado de la Pregunta
              </label>
              <textarea
                value={currentQ.text}
                onChange={(e) => handleUpdateQuestionText(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white text-base focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none font-medium"
                placeholder="Escribe la pregunta..."
              />
            </div>

            {/* 4 Alternatives with Colors and Card Suits */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                4 Alternativas (Kahoot 2x2: Rojo Corazones, Azul Diamantes, Amarillo Tréboles, Verde Picas)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[0, 1, 2, 3].map((optIdx) => {
                  const opt = currentQ.options[optIdx];
                  const suitDef = SUIT_DEFINITIONS[optIdx];
                  const isCorrect = currentQ.correctOptionIndex === optIdx;

                  return (
                    <div
                      key={optIdx}
                      className={`relative p-3.5 rounded-xl border-2 transition ${
                        isCorrect
                          ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
                          : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-7 h-7 rounded-lg text-white font-bold text-base flex items-center justify-center shadow ${
                              optIdx === 0
                                ? 'bg-rose-600'
                                : optIdx === 1
                                ? 'bg-blue-600'
                                : optIdx === 2
                                ? 'bg-amber-500 text-slate-950'
                                : 'bg-emerald-600'
                            }`}
                          >
                            {suitDef.symbol}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {suitDef.colorName} ({suitDef.symbol})
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSetCorrectOption(optIdx)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                            isCorrect
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          {isCorrect ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Correcta</span>
                            </>
                          ) : (
                            <span>Marcar correcta</span>
                          )}
                        </button>
                      </div>

                      <textarea
                        value={opt.text}
                        onChange={(e) => handleUpdateOptionText(optIdx, e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                        placeholder={`Alternativa ${optIdx + 1}...`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Didactic Feedback / Justification */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <HelpCircle className="w-4 h-4 text-indigo-400" />
                <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Retroalimentación Didáctica (Explicación para el Proyector)
                </label>
              </div>
              <textarea
                value={currentQ.feedback}
                onChange={(e) => handleUpdateFeedback(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
                placeholder="Explica didácticamente por qué esta opción es la correcta con base en el documento..."
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Esta justificación se mostrará a los alumnos en el proyector inmediatamente después de cerrar el tiempo de la pregunta.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
