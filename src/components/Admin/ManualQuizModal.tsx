import React, { useState } from 'react';
import {
  PenTool,
  Plus,
  Trash2,
  Copy,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Save,
  Eye,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Quiz, Question, SUIT_DEFINITIONS } from '../../types/index.ts';

interface Props {
  notebookId: string;
  notebookTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onQuizCreated: (quiz: Quiz) => void;
}

interface DraftQuestion {
  id: string;
  text: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  feedback: string;
  timePerQuestion: number;
}

export const ManualQuizModal: React.FC<Props> = ({
  notebookId,
  notebookTitle,
  isOpen,
  onClose,
  onQuizCreated
}) => {
  const [quizTitle, setQuizTitle] = useState<string>(`Cuestionario Manual: ${notebookTitle}`);
  const [quizDescription, setQuizDescription] = useState<string>('Cuestionario elaborado manualmente por el docente.');
  const [defaultDuration, setDefaultDuration] = useState<number>(15);
  const [expandedIndex, setExpandedIndex] = useState<number>(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<DraftQuestion[]>([
    {
      id: `q-${Date.now()}-1`,
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      feedback: '',
      timePerQuestion: 15
    }
  ]);

  if (!isOpen) return null;

  const handleAddQuestion = () => {
    const newQ: DraftQuestion = {
      id: `q-${Date.now()}-${questions.length + 1}`,
      text: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
      feedback: '',
      timePerQuestion: defaultDuration
    };
    setQuestions((prev) => [...prev, newQ]);
    setExpandedIndex(questions.length);
  };

  const handleDuplicateQuestion = (idx: number) => {
    const q = questions[idx];
    const duplicated: DraftQuestion = {
      ...q,
      id: `q-${Date.now()}-${questions.length + 1}`,
      text: `${q.text} (Copia)`
    };
    const updated = [...questions];
    updated.splice(idx + 1, 0, duplicated);
    setQuestions(updated);
    setExpandedIndex(idx + 1);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      setValidationError('El cuestionario debe contener al menos 1 pregunta.');
      return;
    }
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setExpandedIndex(Math.max(0, idx - 1));
  };

  const handleUpdateOption = (qIdx: number, optIdx: number, text: string) => {
    const updated = [...questions];
    const opts = [...updated[qIdx].options] as [string, string, string, string];
    opts[optIdx] = text;
    updated[qIdx].options = opts;
    setQuestions(updated);
  };

  const handleApplyDurationToAll = (sec: number) => {
    setDefaultDuration(sec);
    setQuestions((prev) =>
      prev.map((q) => ({
        ...q,
        timePerQuestion: sec
      }))
    );
  };

  const buildFinalQuiz = (): Quiz | null => {
    setValidationError(null);

    const cleanTitle = quizTitle.trim();
    if (!cleanTitle) {
      setValidationError('Por favor ingresa un título para el cuestionario.');
      return null;
    }

    if (questions.length === 0) {
      setValidationError('Debes redactar al menos 1 pregunta.');
      return null;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        setValidationError(`La Pregunta #${i + 1} no tiene texto de enunciado.`);
        setExpandedIndex(i);
        return null;
      }

      for (let j = 0; j < 4; j++) {
        if (!q.options[j] || !q.options[j].trim()) {
          setValidationError(
            `En la Pregunta #${i + 1}, la Opción ${String.fromCharCode(65 + j)} está vacía. Debes redactar las 4 alternativas.`
          );
          setExpandedIndex(i);
          return null;
        }
      }
    }

    const formattedQuestions: Question[] = questions.map((q, qIdx) => ({
      id: `q-${Date.now()}-${qIdx + 1}`,
      text: q.text.trim(),
      timePerQuestion: q.timePerQuestion || defaultDuration || 15,
      correctOptionIndex: q.correctOptionIndex,
      feedback: q.feedback.trim() || `La opción correcta es la alternativa ${String.fromCharCode(65 + q.correctOptionIndex)}.`,
      explanation: q.feedback.trim() || undefined,
      options: [0, 1, 2, 3].map((optIdx) => ({
        id: String(optIdx),
        text: q.options[optIdx].trim(),
        suit: SUIT_DEFINITIONS[optIdx].suit,
        color: SUIT_DEFINITIONS[optIdx].color,
        symbol: SUIT_DEFINITIONS[optIdx].symbol,
        colorName: SUIT_DEFINITIONS[optIdx].colorName
      })) as [any, any, any, any]
    }));

    return {
      id: 'quiz-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      notebookId,
      title: cleanTitle,
      description: quizDescription.trim() || 'Cuestionario redactado manualmente.',
      timePerQuestion: defaultDuration,
      complexity: 'Medio',
      questions: formattedQuestions,
      approved: true,
      createdAt: Date.now()
    };
  };

  const handleSaveAndReview = () => {
    const quiz = buildFinalQuiz();
    if (quiz) {
      onQuizCreated(quiz);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Redactor Manual de Preguntas</h2>
              <p className="text-xs text-slate-400">Diseña cada pregunta, sus 4 alternativas y la retroalimentación</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Validation Error Banner */}
        {validationError && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-950/60 border border-rose-800 rounded-2xl text-xs font-semibold text-rose-300 flex items-center gap-2.5 shrink-0 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Quiz Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-slate-950/60 border border-slate-800/80 rounded-2xl">
            <div className="md:col-span-7 space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Título del Cuestionario *
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Ej: Evaluación Parcial de Ciencias"
                className="w-full px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Tiempo Base por Pregunta
                </span>
                <span className="text-amber-400 font-mono text-xs">{defaultDuration}s</span>
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[10, 15, 20, 25, 30].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleApplyDurationToAll(sec)}
                    className={`py-1.5 rounded-lg text-xs font-extrabold border transition cursor-pointer ${
                      defaultDuration === sec
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-sm'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Question List Accordion */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Lista de Preguntas ({questions.length})</span>
              </h3>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Pregunta</span>
              </button>
            </div>

            {questions.map((q, qIdx) => {
              const isExpanded = expandedIndex === qIdx;
              const hasEmptyOption = q.options.some((opt) => !opt.trim());
              const isQuestionComplete = q.text.trim().length > 0 && !hasEmptyOption;

              return (
                <div
                  key={q.id}
                  className={`border rounded-2xl transition overflow-hidden shadow-lg ${
                    isExpanded
                      ? 'bg-slate-900/90 border-indigo-500/50 ring-1 ring-indigo-500/20'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Question Header Bar */}
                  <div
                    onClick={() => setExpandedIndex(isExpanded ? -1 : qIdx)}
                    className="p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-950/40"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-black flex items-center justify-center shrink-0">
                        {qIdx + 1}
                      </span>
                      <p className="text-sm font-bold text-white truncate flex-1">
                        {q.text.trim() || <span className="text-slate-500 italic">Escribe el enunciado de la pregunta...</span>}
                      </p>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[11px] font-mono shrink-0">
                        {q.timePerQuestion}s
                      </span>
                      {isQuestionComplete ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-300 rounded text-[10px] font-semibold shrink-0">
                          Incompleta
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicateQuestion(qIdx);
                        }}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                        title="Duplicar pregunta"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteQuestion(qIdx);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                        title="Eliminar pregunta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="p-1 text-slate-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </div>
                  </div>

                  {/* Question Body */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-800/80 space-y-4 bg-slate-900/60">
                      {/* Enunciado */}
                      <div>
                        <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1.5">
                          Enunciado de la Pregunta *
                        </label>
                        <textarea
                          rows={2}
                          value={q.text}
                          onChange={(e) => {
                            const updated = [...questions];
                            updated[qIdx].text = e.target.value;
                            setQuestions(updated);
                          }}
                          placeholder="Ej: ¿Cuál es el proceso celular mediante el cual se divide el núcleo para generar células genéticamente idénticas?"
                          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                        />
                      </div>

                      {/* 4 Options Grid */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            4 Alternativas de Respuesta (Marca la opción correcta con el botón circular)
                          </label>
                          <span className="text-[11px] text-emerald-400 font-semibold">
                            Correcta: Opción {String.fromCharCode(65 + q.correctOptionIndex)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[0, 1, 2, 3].map((optIdx) => {
                            const suit = SUIT_DEFINITIONS[optIdx];
                            const isCorrect = q.correctOptionIndex === optIdx;
                            const letter = String.fromCharCode(65 + optIdx);

                            const bgStyle =
                              optIdx === 0
                                ? 'border-rose-500/40 bg-rose-950/20'
                                : optIdx === 1
                                ? 'border-blue-500/40 bg-blue-950/20'
                                : optIdx === 2
                                ? 'border-amber-500/40 bg-amber-950/20'
                                : 'border-emerald-500/40 bg-emerald-950/20';

                            return (
                              <div
                                key={optIdx}
                                className={`p-3 rounded-2xl border transition relative ${bgStyle} ${
                                  isCorrect ? 'ring-2 ring-emerald-400 shadow-md' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-1.5 text-xs font-black text-white">
                                    <span className="text-base">{suit.symbol}</span>
                                    <span>Opción {letter}</span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...questions];
                                      updated[qIdx].correctOptionIndex = optIdx;
                                      setQuestions(updated);
                                    }}
                                    className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                                      isCorrect
                                        ? 'bg-emerald-500 text-slate-950 font-black shadow'
                                        : 'bg-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    {isCorrect ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 fill-current" />
                                        <span>Correcta</span>
                                      </>
                                    ) : (
                                      <span>Marcar como correcta</span>
                                    )}
                                  </button>
                                </div>

                                <input
                                  type="text"
                                  value={q.options[optIdx]}
                                  onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                                  placeholder={`Escribe la opción ${letter}...`}
                                  className="w-full px-3 py-1.5 bg-slate-950/90 border border-slate-700/80 rounded-xl text-sm font-medium text-white focus:outline-none focus:border-white"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Question Specific Duration & Feedback */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                        <div className="sm:col-span-8">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                            Retroalimentación / Explicación Didáctica
                          </label>
                          <textarea
                            rows={2}
                            value={q.feedback}
                            onChange={(e) => {
                              const updated = [...questions];
                              updated[qIdx].feedback = e.target.value;
                              setQuestions(updated);
                            }}
                            placeholder="Explica a los alumnos por qué esta opción es la correcta..."
                            className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-1">
                            Duración de esta Pregunta
                          </label>
                          <div className="grid grid-cols-3 gap-1.5">
                            {[10, 15, 20, 25, 30].map((sec) => (
                              <button
                                key={sec}
                                type="button"
                                onClick={() => {
                                  const updated = [...questions];
                                  updated[qIdx].timePerQuestion = sec;
                                  setQuestions(updated);
                                }}
                                className={`py-1 rounded-lg text-xs font-mono font-bold border transition cursor-pointer ${
                                  q.timePerQuestion === sec
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                                }`}
                              >
                                {sec}s
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {questions.length} pregunta(s) redactada(s) • Total estimado:{' '}
              {questions.reduce((acc, q) => acc + (q.timePerQuestion || defaultDuration), 0)}s
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleSaveAndReview}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer transform active:scale-95"
            >
              <Eye className="w-4 h-4 fill-current" />
              <span>Revisar y Guardar Cuestionario</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
