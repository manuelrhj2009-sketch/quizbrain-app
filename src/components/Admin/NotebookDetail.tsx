import React, { useState } from 'react';
import {
  FileText,
  UploadCloud,
  Plus,
  Play,
  Sparkles,
  Trash2,
  Clock,
  History,
  CheckCircle,
  FileCode,
  ArrowLeft,
  Eye,
  FileCheck,
  Trophy,
  ExternalLink,
  Presentation,
  BookOpen,
  AlertCircle,
  X,
  Loader2,
  Calculator,
  Download,
  Copy,
  Table,
  FileSpreadsheet,
  Printer,
  Check,
  Zap,
  PenTool
} from 'lucide-react';
import { Notebook, DocumentSource, Quiz, GameSessionHistory } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { QuizGeneratorModal } from './QuizGeneratorModal.tsx';
import { QuizReviewer } from './QuizReviewer.tsx';
import { NotebookLmModal } from './NotebookLmModal.tsx';
import { ManualQuizModal } from './ManualQuizModal.tsx';
import { ExcelQuizModal } from './ExcelQuizModal.tsx';

interface Props {
  notebook: Notebook;
  onBack: () => void;
  onLaunchQuiz: (quiz: Quiz) => void;
  onRefreshNotebook: () => void;
}

export const NotebookDetail: React.FC<Props> = ({
  notebook,
  onBack,
  onLaunchQuiz,
  onRefreshNotebook
}) => {
  const [activeTab, setActiveTab] = useState<'sources' | 'quizzes' | 'history'>('sources');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isGeneratorOpen, setIsGeneratorOpen] = useState<boolean>(false);
  const [isNotebookLmModalOpen, setIsNotebookLmModalOpen] = useState<boolean>(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState<boolean>(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [quizForReview, setQuizForReview] = useState<Quiz | null>(null);

  // Local optimistic sources state for instant, responsive UI
  const [localSources, setLocalSources] = useState<DocumentSource[]>(notebook.sources || []);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Sync when notebook prop refreshes
  React.useEffect(() => {
    setLocalSources(notebook.sources || []);
  }, [notebook.sources]);

  // Modals for notes and previews
  const [showAddNoteModal, setShowAddNoteModal] = useState<boolean>(false);
  const [noteTitle, setNoteTitle] = useState<string>('');
  const [noteContent, setNoteContent] = useState<string>('');
  const [previewSource, setPreviewSource] = useState<DocumentSource | null>(null);
  const [viewHistorySession, setViewHistorySession] = useState<GameSessionHistory | null>(null);

  // In-app confirmation dialogs (avoids window.confirm which is blocked in iframes!)
  const [sourceToDelete, setSourceToDelete] = useState<DocumentSource | null>(null);
  const [quizToDelete, setQuizToDelete] = useState<Quiz | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Toast notification system (avoids window.alert)
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Rankings & Post-evaluation Grading state
  const [activeGradingSessionId, setActiveGradingSessionId] = useState<string | null>(null);
  const [maxScoreInput, setMaxScoreInput] = useState<string>('20');
  const [scoreFormula, setScoreFormula] = useState<'proportional_leader' | 'proportional_total' | 'rank_step'>('proportional_leader');
  const [exportModalSession, setExportModalSession] = useState<GameSessionHistory | null>(null);
  const [exportFormatTab, setExportFormatTab] = useState<'table' | 'text'>('table');
  const [isSavingGrades, setIsSavingGrades] = useState<boolean>(false);
  const [localHistory, setLocalHistory] = useState<GameSessionHistory[]>(notebook.history || []);

  // Sync localHistory when notebook prop changes
  React.useEffect(() => {
    setLocalHistory(notebook.history || []);
  }, [notebook.history]);

  const calculateGradesForSession = (
    session: GameSessionHistory,
    maxScore: number,
    formula: 'proportional_leader' | 'proportional_total' | 'rank_step'
  ): GameSessionHistory => {
    const ranking = [...session.ranking];
    const topEntry = ranking[0];
    const topScore = topEntry ? topEntry.score : 0;
    const totalQuestions = session.totalQuestions || 1;
    const totalPlayers = ranking.length;

    const updatedRanking = ranking.map((student, idx) => {
      let grade = 0;
      if (formula === 'proportional_leader') {
        // First place gets maxScore; others get proportional based on score performance relative to top student
        if (topScore > 0) {
          grade = (student.score / topScore) * maxScore;
        } else {
          grade = 0;
        }
      } else if (formula === 'proportional_total') {
        // Proportional to total questions of the evaluation
        grade = (student.score / totalQuestions) * maxScore;
      } else if (formula === 'rank_step') {
        // Inversely proportional based on rank position
        if (totalPlayers <= 1) {
          grade = maxScore;
        } else {
          const step = (maxScore * 0.75) / (totalPlayers - 1);
          grade = Math.max(0, maxScore - (idx * step));
        }
      }

      // Round to 2 decimals
      const roundedGrade = Math.round(grade * 100) / 100;
      return {
        ...student,
        assignedGrade: roundedGrade,
        gradeScaleMax: maxScore
      };
    });

    return {
      ...session,
      maxConfiguredScore: maxScore,
      scoreFormula: formula,
      ranking: updatedRanking
    };
  };

  const handleApplyGrading = (session: GameSessionHistory) => {
    const maxScore = parseFloat(maxScoreInput);
    if (isNaN(maxScore) || maxScore <= 0) {
      showToast('error', 'Por favor ingresa un puntaje máximo válido mayor a 0 (ej. 20).');
      return;
    }

    const calculated = calculateGradesForSession(session, maxScore, scoreFormula);
    const updatedHistory = localHistory.map((h) => (h.id === session.id ? calculated : h));
    setLocalHistory(updatedHistory);
    if (viewHistorySession?.id === session.id) {
      setViewHistorySession(calculated);
    }
    showToast('success', `¡Puntaje proporcional calculado sobre escala máxima de ${maxScore} pts!`);
  };

  const handleSaveAssignedGrades = async (sessionToSave: GameSessionHistory) => {
    setIsSavingGrades(true);
    try {
      await api.saveHistory(notebook.id, sessionToSave);
      const updatedList = localHistory.map((h) => (h.id === sessionToSave.id ? sessionToSave : h));
      setLocalHistory(updatedList);
      showToast('success', `Calificaciones y segundo puntaje guardados para "${sessionToSave.quizTitle}".`);
      onRefreshNotebook();
    } catch (err: unknown) {
      showToast('error', (err as Error).message || 'Error al guardar calificaciones.');
    } finally {
      setIsSavingGrades(false);
    }
  };

  const generateTextReport = (session: GameSessionHistory): string => {
    const maxScore = session.maxConfiguredScore || 20;
    const formulaLabels = {
      proportional_leader: 'Proporcional a la Performance del 1° Puesto (Líder = Puntaje Máx.)',
      proportional_total: 'Proporcional al Total de Preguntas',
      rank_step: 'Inversamente Proporcional por Puesto en Ranking'
    };
    const formulaText = session.scoreFormula
      ? formulaLabels[session.scoreFormula]
      : 'Proporcional a la Performance del 1° Puesto';

    const lines: string[] = [];
    lines.push('========================================================================================');
    lines.push(`REPORTE DE CALIFICACIONES Y EVALUACIÓN: ${session.quizTitle.toUpperCase()}`);
    lines.push(`Cuaderno de Estudio : ${notebook.title}`);
    lines.push(`Fecha de Evaluación : ${new Date(session.playedAt).toLocaleString()}`);
    lines.push(`Total Alumnos       : ${session.totalPlayers} participantes`);
    lines.push(`Total Preguntas     : ${session.totalQuestions} preguntas`);
    lines.push(`Puntaje Máximo      : ${maxScore} puntos (Escala de Calificación)`);
    lines.push(`Criterio de Cálculo : ${formulaText}`);
    lines.push('========================================================================================');
    lines.push('PUESTO | ALUMNO                          | PTS ORIGINALES | CALIFICACIÓN       | TIEMPO');
    lines.push('----------------------------------------------------------------------------------------');

    session.ranking.forEach((r) => {
      const rankStr = `${r.rank}º`.padEnd(6, ' ');
      const nameStr = (r.fullName || '').padEnd(31, ' ');
      const origStr = `${r.score} pts`.padEnd(14, ' ');
      const gradeVal = r.assignedGrade !== undefined ? `${r.assignedGrade.toFixed(2)} / ${maxScore}` : 'Pendiente';
      const gradeStr = gradeVal.padEnd(18, ' ');
      const timeStr = `${r.totalTime.toFixed(3)}s`;
      lines.push(`${rankStr} | ${nameStr} | ${origStr} | ${gradeStr} | ${timeStr}`);
    });

    lines.push('========================================================================================');
    lines.push('DocuQuiz Live • Calificación Oficial Posterior a la Evaluación');
    return lines.join('\n');
  };

  const generateCsvReport = (session: GameSessionHistory): string => {
    const maxScore = session.maxConfiguredScore || 20;
    const rows = [
      ['Puesto', 'Apellido y Nombre', 'Respuestas Correctas (Pts Originales)', `Calificacion Posterior (Max ${maxScore})`, 'Escala Maxima', 'Tiempo Total Acumulado (s)', 'Nivel de Logro']
    ];

    session.ranking.forEach((r) => {
      const grade = r.assignedGrade !== undefined ? r.assignedGrade.toFixed(2) : '';
      let status = '';
      if (r.assignedGrade !== undefined) {
        const ratio = r.assignedGrade / maxScore;
        if (ratio >= 0.85) status = 'Sobresaliente / AD';
        else if (ratio >= 0.65) status = 'Logrado / A';
        else if (ratio >= 0.50) status = 'En Proceso / B';
        else status = 'En Inicio / C';
      }
      rows.push([
        String(r.rank),
        `"${r.fullName.replace(/"/g, '""')}"`,
        String(r.score),
        grade,
        String(maxScore),
        r.totalTime.toFixed(3),
        status
      ]);
    });

    return '\uFEFF' + rows.map((r) => r.join(';')).join('\n');
  };

  const generateTsvReport = (session: GameSessionHistory): string => {
    const maxScore = session.maxConfiguredScore || 20;
    const rows = [
      ['Puesto', 'Apellido y Nombre', 'Respuestas Correctas (Pts Originales)', `Calificación Posterior (/${maxScore})`, 'Tiempo Total (s)']
    ];

    session.ranking.forEach((r) => {
      const grade = r.assignedGrade !== undefined ? r.assignedGrade.toFixed(2) : '-';
      rows.push([
        `${r.rank}º`,
        r.fullName,
        `${r.score} pts`,
        grade,
        `${r.totalTime.toFixed(3)}s`
      ]);
    });

    return rows.map((r) => r.join('\t')).join('\n');
  };

  const downloadFile = (filename: string, content: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('success', `Archivo "${filename}" descargado exitosamente.`);
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast('success', `${label} copiado al portapapeles.`);
    } catch {
      showToast('error', 'No se pudo copiar al portapapeles.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        showToast('info', `Procesando y extrayendo contenido de "${file.name}"...`);
        const newSrc = await api.uploadFileSource(notebook.id, file);
        setLocalSources((prev) => [newSrc, ...prev]);
        successCount++;
      }
      onRefreshNotebook();
      showToast('success', `¡${successCount} fuente(s) procesada(s) y agregada(s) al cuaderno!`);
    } catch (err: unknown) {
      showToast('error', (err as Error).message || 'Error al procesar y subir el archivo.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    try {
      const newSrc = await api.addTextSource(notebook.id, noteTitle || 'Nota de texto', noteContent);
      setLocalSources((prev) => [newSrc, ...prev]);
      setNoteTitle('');
      setNoteContent('');
      setShowAddNoteModal(false);
      onRefreshNotebook();
      showToast('success', 'Nota de texto guardada en el cuaderno.');
    } catch (err: unknown) {
      showToast('error', (err as Error).message || 'Error al guardar texto.');
    }
  };

  // Immediate 1-click delete with instant optimistic UI update
  const handleDirectDeleteSource = async (sourceId: string, sourceName: string) => {
    // 1. Instantly remove from local UI
    setLocalSources((prev) => prev.filter((s) => s.id !== sourceId));
    setConfirmDeleteId(null);
    setSourceToDelete(null);
    notebook.sources = (notebook.sources || []).filter((s) => s.id !== sourceId);
    showToast('info', `Eliminando fuente "${sourceName}"...`);

    try {
      await api.deleteSource(notebook.id, sourceId);
      showToast('success', `Fuente "${sourceName}" eliminada correctamente.`);
      onRefreshNotebook();
    } catch (err: unknown) {
      // Revert if error
      setLocalSources(notebook.sources || []);
      showToast('error', (err as Error).message || 'Error al eliminar fuente.');
    }
  };

  const handleConfirmDeleteSource = async () => {
    if (!sourceToDelete) return;
    await handleDirectDeleteSource(sourceToDelete.id, sourceToDelete.name);
  };

  const handleConfirmDeleteQuiz = async () => {
    if (!quizToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteQuiz(notebook.id, quizToDelete.id);
      showToast('success', `Cuestionario "${quizToDelete.title}" eliminado.`);
      setQuizToDelete(null);
      onRefreshNotebook();
    } catch (err: unknown) {
      showToast('error', (err as Error).message || 'Error al eliminar cuestionario.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (quizForReview) {
    return (
      <QuizReviewer
        quiz={quizForReview}
        notebookTitle={notebook.title}
        onBack={() => setQuizForReview(null)}
        onQuizApproved={(approvedQuiz) => {
          setQuizForReview(null);
          onRefreshNotebook();
          setActiveTab('quizzes');
          showToast('success', '¡Cuestionario aprobado y listo para proyectar!');
        }}
      />
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-2xl border shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-950 border-emerald-700 text-emerald-200'
              : notification.type === 'error'
              ? 'bg-rose-950 border-rose-700 text-rose-200'
              : 'bg-indigo-950 border-indigo-700 text-indigo-200'
          }`}
        >
          {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
          {notification.type === 'info' && <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0 mt-0.5" />}
          <div className="flex-1 text-xs font-semibold leading-relaxed">
            {notification.message}
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-80 rounded text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Notebook Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Volver a todos los Cuadernos
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {notebook.title}
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl">
              {notebook.description || 'Sin descripción adicional.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsGeneratorOpen(true)}
              className="px-3.5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
              title="Generar preguntas con IA (a partir de fuentes o mediante prompt libre)"
            >
              <Sparkles className="w-4 h-4 text-indigo-200" />
              <span>Generar con IA</span>
            </button>

            <button
              onClick={() => setIsManualModalOpen(true)}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
              title="Redactar preguntas de forma manual paso a paso"
            >
              <PenTool className="w-4 h-4 text-emerald-200" />
              <span>Redactar Manualmente</span>
            </button>

            <button
              onClick={() => setIsExcelModalOpen(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xl border border-slate-700 transition flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
              title="Descargar plantilla y cargar preguntas desde archivo Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Cargar desde Excel</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mt-6 pt-5 border-t border-slate-800 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('sources')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'sources'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Fuentes de Información ({notebook.sources.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'quizzes'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileCheck className="w-4 h-4" />
            <span>Cuestionarios ({notebook.quizzes.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
              activeTab === 'history'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial de Rankings ({notebook.history?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Sources */}
      {activeTab === 'sources' && (
        <div className="space-y-6">
          {/* Action Bar for Sources */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-white">Archivos y Documentos del Cuaderno</h2>
              <p className="text-xs text-slate-400">
                Sube archivos en formato <strong>PDF</strong>, <strong>Word (.docx, .doc)</strong>, <strong>Excel (.xlsx, .xls, .csv)</strong>, <strong>PowerPoint (.pptx, .ppt)</strong>, <strong>Texto (.txt)</strong> o conecta directamente con <strong>NotebookLM</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Connect to NotebookLM Button */}
              <button
                onClick={() => setIsNotebookLmModalOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-violet-600/20 transition flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-violet-200" />
                <span>Conectar con NotebookLM</span>
              </button>

              {/* Upload Document Button */}
              <label className="cursor-pointer px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-1.5">
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                <span>{isUploading ? 'Procesando archivo...' : 'Subir Archivo'}</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.docx,.doc,.pptx,.ppt,.pps,.ppsx,.xlsx,.xls,.csv,.txt,.md"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>

              {/* Manual Note Button */}
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Escribir Texto</span>
              </button>
            </div>
          </div>

          {/* Sources List */}
          {localSources.length === 0 ? (
            <div className="text-center py-14 px-4 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
              <FileCode className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">No hay documentos en este cuaderno</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                Sube un archivo PDF, Word (.docx, .doc), Excel (.xlsx, .csv), PowerPoint (.pptx, .ppt) o conecta con NotebookLM. También puedes generar preguntas con IA directamente mediante un prompt sin subir fuentes.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={() => setIsNotebookLmModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Conectar NotebookLM</span>
                </button>
                <label className="inline-flex items-center gap-2 cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition">
                  <UploadCloud className="w-4 h-4" />
                  <span>Subir PDF / Word / Excel / PPTX</span>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx,.doc,.pptx,.ppt,.pps,.ppsx,.xlsx,.xls,.csv,.txt,.md"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localSources.map((src) => {
                const isPdf = src.type === 'pdf';
                const isWord = src.type === 'docx';
                const isPpt = src.type === 'pptx';
                const isExcel = src.type === 'xlsx';
                const isNotebookLm = src.type === 'notebooklm';

                return (
                  <div
                    key={src.id}
                    className="p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition flex flex-col justify-between group shadow-lg"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          {isPdf && (
                            <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30 text-[11px] font-mono uppercase font-bold flex items-center gap-1 shrink-0">
                              <FileText className="w-3 h-3" />
                              PDF
                            </span>
                          )}
                          {isWord && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-lg border border-blue-500/30 text-[11px] font-mono uppercase font-bold flex items-center gap-1 shrink-0">
                              <FileText className="w-3 h-3" />
                              DOCX
                            </span>
                          )}
                          {isPpt && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-500/30 text-[11px] font-mono uppercase font-bold flex items-center gap-1 shrink-0">
                              <Presentation className="w-3 h-3" />
                              PPTX
                            </span>
                          )}
                          {isExcel && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/30 text-[11px] font-mono uppercase font-bold flex items-center gap-1 shrink-0">
                              <FileSpreadsheet className="w-3 h-3" />
                              EXCEL
                            </span>
                          )}
                          {isNotebookLm && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-violet-500/20 to-indigo-500/20 text-violet-300 rounded-lg border border-violet-500/30 text-[11px] font-mono font-bold flex items-center gap-1 shrink-0">
                              <Sparkles className="w-3 h-3 text-violet-400" />
                              NotebookLM
                            </span>
                          )}
                          {!isPdf && !isWord && !isPpt && !isExcel && !isNotebookLm && (
                            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded-lg border border-slate-700 text-[11px] font-mono uppercase font-bold shrink-0">
                              {src.type}
                            </span>
                          )}

                          <h4 className="text-sm font-bold text-white truncate" title={src.name}>{src.name}</h4>
                        </div>

                        {/* Inline Delete Confirmation or Direct Trash Trigger */}
                        {confirmDeleteId === src.id ? (
                          <div className="flex items-center gap-1 shrink-0 animate-in fade-in">
                            <button
                              type="button"
                              onClick={() => handleDirectDeleteSource(src.id, src.name)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[11px] font-bold shadow-sm transition flex items-center gap-1 cursor-pointer"
                              title="Confirmar eliminación permanente"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Eliminar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-1.5 py-1 text-slate-400 hover:text-white rounded-lg text-[11px] hover:bg-slate-800 transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(src.id)}
                            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
                            title="Eliminar fuente de información"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-400 line-clamp-3 bg-slate-950 p-3 rounded-xl border border-slate-800/80 font-mono leading-relaxed">
                        {src.content}
                      </p>

                      {src.notebookLmUrl && (
                        <div className="mt-2 text-[11px] flex items-center gap-1 text-violet-400 font-mono truncate">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <a
                            href={src.notebookLmUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline truncate hover:text-violet-300"
                          >
                            {src.notebookLmUrl}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-4 pt-3 border-t border-slate-800/80">
                      <span>{src.charCount.toLocaleString()} caracteres</span>
                      <button
                        onClick={() => setPreviewSource(src)}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Ver completo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Quizzes */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <div>
              <h2 className="text-sm font-bold text-white">Cuestionarios Disponibles</h2>
              <p className="text-xs text-slate-400">
                Selecciona un cuestionario aprobado para proyectarlo en pantalla gigante e iniciar la sesión interactiva en vivo.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setIsGeneratorOpen(true)}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generar con IA</span>
              </button>

              <button
                onClick={() => setIsManualModalOpen(true)}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Redactar Manual</span>
              </button>

              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Desde Excel</span>
              </button>
            </div>
          </div>

          {notebook.quizzes.length === 0 ? (
            <div className="text-center py-12 px-6 border border-slate-800 rounded-3xl bg-slate-900/30 space-y-6">
              <div className="max-w-md mx-auto space-y-2">
                <Sparkles className="w-10 h-10 text-indigo-400 mx-auto" />
                <h3 className="text-base font-bold text-white">Crea tu primer Cuestionario</h3>
                <p className="text-xs text-slate-400">
                  Elige la modalidad que prefieras para crear las preguntas de tu evaluación interactiva:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
                {/* Option 1: AI */}
                <div
                  onClick={() => setIsGeneratorOpen(true)}
                  className="p-5 bg-slate-900/90 border border-indigo-500/30 hover:border-indigo-500 rounded-2xl cursor-pointer transition group shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 group-hover:scale-110 transition" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Generar con IA</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Genera preguntas con Gemini 3.8 Flash a partir de las fuentes del cuaderno o directamente mediante un tema/prompt.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-400 mt-4 block">Abrir generador →</span>
                </div>

                {/* Option 2: Manual */}
                <div
                  onClick={() => setIsManualModalOpen(true)}
                  className="p-5 bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500 rounded-2xl cursor-pointer transition group shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                      <PenTool className="w-5 h-5 group-hover:scale-110 transition" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Redactar Manualmente</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Escribe cada pregunta, sus 4 alternativas, asigna la respuesta correcta, tiempo y retroalimentación pedagógica.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 mt-4 block">Redactar preguntas →</span>
                </div>

                {/* Option 3: Excel */}
                <div
                  onClick={() => setIsExcelModalOpen(true)}
                  className="p-5 bg-slate-900/90 border border-slate-700 hover:border-emerald-500/60 rounded-2xl cursor-pointer transition group shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="w-9 h-9 rounded-xl bg-slate-800 text-emerald-400 border border-slate-700 flex items-center justify-center">
                      <FileSpreadsheet className="w-5 h-5 group-hover:scale-110 transition" />
                    </div>
                    <h4 className="text-sm font-bold text-white">Cargar desde Excel</h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Descarga la plantilla oficial en Excel (.xlsx), completa las preguntas y cárgalas masivamente en segundos.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 mt-4 block">Subir archivo Excel →</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notebook.quizzes.map((quiz) => (
                <div
                  key={quiz.id}
                  className="p-5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-slate-700 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        {quiz.approved ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Aprobado
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30">
                            Borrador
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-mono border border-indigo-500/30">
                          {quiz.complexity}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setQuizToDelete(quiz)}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                        title="Eliminar cuestionario"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{quiz.title}</h3>
                    <p className="text-xs text-slate-400 mb-3">{quiz.description}</p>

                    <div className="flex items-center gap-4 text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 mb-4">
                      <span><strong>{quiz.questions.length}</strong> preguntas</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <strong>{quiz.timePerQuestion}s</strong> por pregunta
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setQuizForReview(quiz)}
                      className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition text-center"
                    >
                      Revisar / Editar
                    </button>

                    <button
                      onClick={() => onLaunchQuiz(quiz)}
                      className="flex-1 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-1.5"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Iniciar en Proyector</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: History & Rankings */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Historial de Rankings y Calificación de Evaluaciones</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Consulta los resultados de las partidas proyectadas, asigna un <strong>segundo puntaje proporcional</strong> para efectos de calificación (ej. escala de 20 pts) sin reemplazar el puntaje original de aciertos, y <strong>exporta los resultados</strong> en texto o tabla.
              </p>
            </div>
          </div>

          {(!localHistory || localHistory.length === 0) ? (
            <div className="text-center py-16 px-4 border border-dashed border-slate-800 rounded-3xl bg-slate-900/30">
              <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-300">Aún no hay partidas jugadas</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Al proyectar un cuestionario e iniciarlo en vivo con los alumnos, la clasificación final se guardará automáticamente aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {localHistory.map((hist) => {
                const hasAssignedGrades = hist.ranking.some((r) => r.assignedGrade !== undefined);
                const isGradingOpen = activeGradingSessionId === hist.id;
                const isTableOpen = viewHistorySession?.id === hist.id;

                return (
                  <div
                    key={hist.id}
                    className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl space-y-4 shadow-lg transition"
                  >
                    {/* Session Header Card */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-lg font-bold text-white">{hist.quizTitle}</h4>
                          {hasAssignedGrades && (
                            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[11px] font-bold border border-indigo-500/30 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-indigo-400" />
                              Calificación Asignada (Escala máx: {hist.maxConfiguredScore || 20} pts)
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
                          <span>📅 {new Date(hist.playedAt).toLocaleString()}</span>
                          <span>•</span>
                          <span>👥 <strong>{hist.totalPlayers}</strong> alumnos</span>
                          <span>•</span>
                          <span>❓ <strong>{hist.totalQuestions}</strong> preguntas</span>
                        </p>
                      </div>

                      {/* Top Action Buttons for this session */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Toggle Grading Panel Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (isGradingOpen) {
                              setActiveGradingSessionId(null);
                            } else {
                              setActiveGradingSessionId(hist.id);
                              if (hist.maxConfiguredScore) {
                                setMaxScoreInput(String(hist.maxConfiguredScore));
                              }
                              if (hist.scoreFormula) {
                                setScoreFormula(hist.scoreFormula);
                              }
                              // Auto open table when grading
                              setViewHistorySession(hist);
                            }
                          }}
                          className={`px-3.5 py-2 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border ${
                            isGradingOpen
                              ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                              : 'bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border-indigo-500/30'
                          }`}
                        >
                          <Calculator className="w-3.5 h-3.5" />
                          <span>{isGradingOpen ? 'Ocultar Asignador' : 'Asignar Puntaje Posterior'}</span>
                        </button>

                        {/* Export Results Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setExportModalSession(hist);
                            setExportFormatTab('table');
                          }}
                          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Exportar Resultados</span>
                        </button>

                        {/* Toggle Table View Button */}
                        <button
                          type="button"
                          onClick={() => setViewHistorySession(isTableOpen ? null : hist)}
                          className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>{isTableOpen ? 'Ocultar Tabla' : 'Ver Tabla'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Post-evaluation Score Assignment Configurator Panel */}
                    {isGradingOpen && (
                      <div className="p-4 bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-2xl space-y-4 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                                <Calculator className="w-4 h-4" />
                              </span>
                              <h5 className="text-sm font-bold text-white">
                                Asignación de Calificación Posterior a la Evaluación
                              </h5>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                              Establece un puntaje máximo (por ejemplo, <strong>20 puntos</strong>). El alumno del 1º puesto recibirá el puntaje máximo y los demás alumnos recibirán puntajes proporcionales según su desempeño. Este cálculo se agregará como un <strong>segundo puntaje</strong> para efectos de calificación, sin sustituir los aciertos originales.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveGradingSessionId(null)}
                            className="text-slate-400 hover:text-white p-1"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {/* 1. Maximum Score Input */}
                          <div className="space-y-2 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                              1. Puntaje Máximo Establecido (Escala)
                            </label>
                            <div className="flex flex-wrap items-center gap-2">
                              {[20, 100, 10].map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setMaxScoreInput(String(preset))}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                    maxScoreInput === String(preset)
                                      ? 'bg-indigo-600 border-indigo-500 text-white shadow'
                                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                                  }`}
                                >
                                  {preset} puntos {preset === 20 ? '(Estándar Perú/LatAm)' : ''}
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <span className="text-xs text-slate-400">O ingresar valor manual:</span>
                              <input
                                type="number"
                                min="1"
                                max="1000"
                                step="1"
                                value={maxScoreInput}
                                onChange={(e) => setMaxScoreInput(e.target.value)}
                                className="w-24 px-3 py-1 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-center font-bold text-sm focus:outline-none focus:border-indigo-500"
                                placeholder="ej. 20"
                              />
                              <span className="text-xs text-slate-400 font-semibold">pts máximos</span>
                            </div>
                          </div>

                          {/* 2. Calculation Formula Method */}
                          <div className="space-y-2 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                              2. Criterio de Asignación Proporcional
                            </label>

                            <div className="space-y-2 text-xs">
                              <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-800/60 transition">
                                <input
                                  type="radio"
                                  name={`formula-${hist.id}`}
                                  checked={scoreFormula === 'proportional_leader'}
                                  onChange={() => setScoreFormula('proportional_leader')}
                                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <span className="font-bold text-white block">
                                    Proporcional al Líder (1° puesto = Puntaje Máximo)
                                  </span>
                                  <span className="text-[11px] text-slate-400 leading-tight block">
                                    El 1° puesto obtiene {maxScoreInput} pts y los demás alumnos obtienen puntajes proporcionales a sus aciertos respecto al líder.
                                  </span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-800/60 transition">
                                <input
                                  type="radio"
                                  name={`formula-${hist.id}`}
                                  checked={scoreFormula === 'proportional_total'}
                                  onChange={() => setScoreFormula('proportional_total')}
                                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <span className="font-bold text-white block">
                                    Proporcional al Total de Preguntas ({hist.totalQuestions} preguntas)
                                  </span>
                                  <span className="text-[11px] text-slate-400 leading-tight block">
                                    Cada acierto vale {(parseFloat(maxScoreInput || '20') / (hist.totalQuestions || 1)).toFixed(2)} pts.
                                  </span>
                                </div>
                              </label>

                              <label className="flex items-start gap-2.5 cursor-pointer p-2 rounded-lg hover:bg-slate-800/60 transition">
                                <input
                                  type="radio"
                                  name={`formula-${hist.id}`}
                                  checked={scoreFormula === 'rank_step'}
                                  onChange={() => setScoreFormula('rank_step')}
                                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                  <span className="font-bold text-white block">
                                    Inversamente Proporcional por Puesto en Ranking
                                  </span>
                                  <span className="text-[11px] text-slate-400 leading-tight block">
                                    Puntaje escalonado que desciende según la posición del alumno en el podio.
                                  </span>
                                </div>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Calculation & Save Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800">
                          <span className="text-xs text-amber-300 flex items-center gap-1.5 font-medium">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>El segundo puntaje se reflejará de inmediato en la tabla inferior</span>
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApplyGrading(hist)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                            >
                              <Calculator className="w-3.5 h-3.5" />
                              <span>Calcular Calificaciones</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const currentSession = localHistory.find((h) => h.id === hist.id) || hist;
                                handleSaveAssignedGrades(currentSession);
                              }}
                              disabled={isSavingGrades}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                              {isSavingGrades ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              <span>Guardar en Historial</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Rankings & Grades Table */}
                    {isTableOpen && (
                      <div className="overflow-x-auto space-y-3 pt-1">
                        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200">Resultados Oficiales:</span>
                            <span>{hist.ranking.length} alumnos registrados</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setExportModalSession(hist);
                                setExportFormatTab('text');
                              }}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                            >
                              <Copy className="w-3 h-3" />
                              <span>Copiar texto</span>
                            </button>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() => {
                                setExportModalSession(hist);
                                setExportFormatTab('table');
                              }}
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                            >
                              <FileSpreadsheet className="w-3 h-3" />
                              <span>Descargar CSV</span>
                            </button>
                          </div>
                        </div>

                        <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden shadow-inner">
                          <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800">
                            <tr>
                              <th className="py-3 px-4 w-20">Puesto</th>
                              <th className="py-3 px-4">Apellido y Nombre</th>
                              <th className="py-3 px-4 text-center">
                                Puntaje Original (Aciertos)
                              </th>
                              <th className="py-3 px-4 text-center bg-indigo-950/30 text-indigo-300 border-x border-indigo-900/30">
                                Calificación Posterior ({hist.maxConfiguredScore || 20} pts)
                              </th>
                              <th className="py-3 px-4 text-right">Tiempo Total (s)</th>
                              <th className="py-3 px-4 text-center">Nivel de Logro</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                            {hist.ranking.map((row) => {
                              const maxScale = hist.maxConfiguredScore || 20;
                              const grade = row.assignedGrade;
                              let achievementBadge = null;

                              if (grade !== undefined) {
                                const ratio = grade / maxScale;
                                if (ratio >= 0.85) {
                                  achievementBadge = (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 text-[10px]">
                                      AD - Destacado
                                    </span>
                                  );
                                } else if (ratio >= 0.65) {
                                  achievementBadge = (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30 text-[10px]">
                                      A - Logrado
                                    </span>
                                  );
                                } else if (ratio >= 0.50) {
                                  achievementBadge = (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30 text-[10px]">
                                      B - En Proceso
                                    </span>
                                  );
                                } else {
                                  achievementBadge = (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 text-[10px]">
                                      C - En Inicio
                                    </span>
                                  );
                                }
                              }

                              return (
                                <tr
                                  key={row.playerId}
                                  className={`hover:bg-slate-800/40 transition ${
                                    row.rank === 1 ? 'bg-amber-500/5' : ''
                                  }`}
                                >
                                  <td className="py-3 px-4 font-bold text-slate-200">
                                    {row.rank === 1 && <span className="text-amber-400">🥇 1º</span>}
                                    {row.rank === 2 && <span className="text-slate-300">🥈 2º</span>}
                                    {row.rank === 3 && <span className="text-amber-600">🥉 3º</span>}
                                    {row.rank > 3 && `${row.rank}º`}
                                  </td>
                                  <td className="py-3 px-4 font-semibold text-white">
                                    {row.fullName}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                                      {row.score} pts ({row.score}/{hist.totalQuestions})
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center bg-indigo-950/20 border-x border-indigo-900/30">
                                    {grade !== undefined ? (
                                      <span className="px-3 py-1 rounded-lg bg-indigo-500/25 text-indigo-200 font-black font-mono text-sm border border-indigo-500/40 shadow-sm">
                                        {grade.toFixed(2)} / {maxScale}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500 italic text-[11px]">
                                        Pendiente de cálculo
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-right font-mono font-medium text-amber-400">
                                    {row.totalTime.toFixed(3)}s
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    {achievementBadge || <span className="text-slate-500">-</span>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Export Results Modal (Text and Table Formats) */}
      {exportModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-6 flex flex-col space-y-4 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Exportar Resultados: {exportModalSession.quizTitle}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {exportModalSession.totalPlayers} alumnos participantes • Escala de calificación: {exportModalSession.maxConfiguredScore || 20} pts
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setExportModalSession(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Format Selection Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setExportFormatTab('table')}
                className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                  exportFormatTab === 'table'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Table className="w-4 h-4" />
                <span>Formato Tabla (Excel / CSV / Sheets)</span>
              </button>

              <button
                type="button"
                onClick={() => setExportFormatTab('text')}
                className={`px-4 py-2 rounded-xl transition flex items-center gap-2 ${
                  exportFormatTab === 'text'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Formato Texto (Resumen / WhatsApp / TXT)</span>
              </button>
            </div>

            {/* Tab 1 Content: Table Export */}
            {exportFormatTab === 'table' && (
              <div className="space-y-4 flex-1 overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-300">
                    Descarga en formato compatible con Microsoft Excel, o copia directo para pegar en Google Sheets.
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const csv = generateCsvReport(exportModalSession);
                        const cleanTitle = exportModalSession.quizTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
                        downloadFile(`${cleanTitle}_calificaciones.csv`, csv, 'text/csv;charset=utf-8;');
                      }}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Excel (.CSV)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const tsv = generateTsvReport(exportModalSession);
                        handleCopyToClipboard(tsv, 'Tabla para Google Sheets / Excel');
                      }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                    >
                      <Copy className="w-4 h-4 text-indigo-400" />
                      <span>Copiar como Tabla (TSV)</span>
                    </button>
                  </div>
                </div>

                {/* Table Preview */}
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-950 text-slate-400 uppercase font-bold sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Puesto</th>
                        <th className="py-2.5 px-3">Apellido y Nombre</th>
                        <th className="py-2.5 px-3 text-center">Pts Originales</th>
                        <th className="py-2.5 px-3 text-center">Calificación (/{exportModalSession.maxConfiguredScore || 20})</th>
                        <th className="py-2.5 px-3 text-right">Tiempo Total (s)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/60 font-mono">
                      {exportModalSession.ranking.map((row) => (
                        <tr key={row.playerId} className="hover:bg-slate-800/40">
                          <td className="py-2 px-3 font-bold text-slate-300">{row.rank}º</td>
                          <td className="py-2 px-3 font-sans font-semibold text-white">{row.fullName}</td>
                          <td className="py-2 px-3 text-center text-emerald-400">{row.score} pts</td>
                          <td className="py-2 px-3 text-center font-bold text-indigo-300">
                            {row.assignedGrade !== undefined ? row.assignedGrade.toFixed(2) : '-'}
                          </td>
                          <td className="py-2 px-3 text-right text-amber-400">{row.totalTime.toFixed(3)}s</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 2 Content: Text Export */}
            {exportFormatTab === 'text' && (
              <div className="space-y-4 flex-1 flex flex-col min-h-0">
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-xs text-slate-300">
                    Formato texto plano listo para enviar por WhatsApp, email o pegar en informes institucionales.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const txt = generateTextReport(exportModalSession);
                        handleCopyToClipboard(txt, 'Reporte en formato texto');
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Copiar Formato Texto</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const txt = generateTextReport(exportModalSession);
                        const cleanTitle = exportModalSession.quizTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
                        downloadFile(`${cleanTitle}_reporte.txt`, txt, 'text/plain;charset=utf-8;');
                      }}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Descargar .TXT</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200 whitespace-pre leading-relaxed select-all">
                  {generateTextReport(exportModalSession)}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setExportModalSession(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Source */}
      {sourceToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar fuente de información?</h3>
                <p className="text-xs text-slate-400">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
              <span className="text-slate-500 block mb-0.5">Archivo a eliminar:</span>
              <strong className="text-white text-sm">{sourceToDelete.name}</strong>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSourceToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSource}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar fuente'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete Quiz */}
      {quizToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Eliminar cuestionario?</h3>
                <p className="text-xs text-slate-400">Se borrarán las preguntas aprobadas asociadas.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-slate-300">
              <span className="text-slate-500 block mb-0.5">Cuestionario:</span>
              <strong className="text-white text-sm">{quizToDelete.title}</strong>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setQuizToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteQuiz}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/30 transition flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{isDeleting ? 'Eliminando...' : 'Sí, eliminar'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Write text note */}
      {showAddNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Escribir o Pegar Texto de Estudio</h3>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Título de la fuente
                </label>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Ej: Resumen del Capítulo 4"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Contenido de estudio
                </label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={8}
                  placeholder="Pega aquí el contenido, notas o temario..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 resize-none font-mono text-xs"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddNoteModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
                >
                  Guardar Fuente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Preview Source */}
      {previewSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{previewSource.name}</h3>
                <p className="text-xs text-slate-400">
                  {previewSource.charCount.toLocaleString()} caracteres • Tipo: {previewSource.type}
                </p>
              </div>
              <button
                onClick={() => setPreviewSource(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
              {previewSource.content}
            </div>
          </div>
        </div>
      )}

      {/* NotebookLM Connection Modal */}
      <NotebookLmModal
        notebookId={notebook.id}
        isOpen={isNotebookLmModalOpen}
        onClose={() => setIsNotebookLmModalOpen(false)}
        onSourceAdded={() => {
          onRefreshNotebook();
          showToast('success', 'Fuente de NotebookLM importada correctamente.');
        }}
      />

      {/* Generator Modal (AI with sources or prompt) */}
      <QuizGeneratorModal
        notebook={notebook}
        isOpen={isGeneratorOpen}
        onClose={() => setIsGeneratorOpen(false)}
        onQuizGenerated={(newQuiz) => {
          setIsGeneratorOpen(false);
          setQuizForReview(newQuiz);
        }}
      />

      {/* Manual Quiz Modal */}
      <ManualQuizModal
        notebookId={notebook.id}
        notebookTitle={notebook.title}
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onQuizCreated={(newQuiz) => {
          setIsManualModalOpen(false);
          setQuizForReview(newQuiz);
        }}
      />

      {/* Excel Quiz Modal */}
      <ExcelQuizModal
        notebookId={notebook.id}
        notebookTitle={notebook.title}
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onQuizImported={(newQuiz) => {
          setIsExcelModalOpen(false);
          setQuizForReview(newQuiz);
        }}
      />
    </div>
  );
};
