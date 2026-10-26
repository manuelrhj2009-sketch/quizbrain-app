import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Eye,
  Info,
  Clock,
  HelpCircle
} from 'lucide-react';
import { Quiz, Question, SUIT_DEFINITIONS } from '../../types/index.ts';

interface Props {
  notebookId: string;
  notebookTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onQuizImported: (quiz: Quiz) => void;
}

interface ParsedRow {
  rowNum: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctLetter: string;
  correctIndex: number;
  durationSec: number;
  feedback: string;
  isValid: boolean;
  errorMessage?: string;
}

export const ExcelQuizModal: React.FC<Props> = ({
  notebookId,
  notebookTitle,
  isOpen,
  onClose,
  onQuizImported
}) => {
  const [quizTitle, setQuizTitle] = useState<string>(`Cuestionario Importado: ${notebookTitle}`);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1. Generate and Download Excel Template
  const handleDownloadTemplate = (format: 'xlsx' | 'csv' = 'xlsx') => {
    try {
      const templateData = [
        [
          'Pregunta',
          'Opción A',
          'Opción B',
          'Opción C',
          'Opción D',
          'Opción Correcta (A, B, C o D)',
          'Tiempo en Segundos (10-30)',
          'Explicación / Retroalimentación Pedagógica'
        ],
        [
          '¿Cuál es el organelo celular encargado de la respiración celular y producción de ATP?',
          'Lisosoma',
          'Mitocondria',
          'Aparato de Golgi',
          'Ribosoma',
          'B',
          15,
          'La mitocondria sintetiza ATP mediante la fosforilación oxidativa.'
        ],
        [
          '¿En qué fase de la mitosis los cromosomas se alinean en el plano ecuatorial?',
          'Profase',
          'Anafase',
          'Metafase',
          'Telofase',
          'C',
          20,
          'En la metafase los cromosomas alcanzan su máxima condensación en la placa ecuatorial.'
        ],
        [
          '¿Cuántos puentes de hidrógeno unen a la Guanina (G) con la Citosina (C) en el ADN?',
          '1 puente de hidrógeno',
          '2 puentes de hidrógeno',
          '3 puentes de hidrógeno',
          '4 puentes de hidrógeno',
          'C',
          15,
          'El par G-C se mantiene unido por 3 puentes de hidrógeno, haciéndolo más estable que el par A-T (2 puentes).'
        ],
        [
          'Según la Primera Ley de Mendel (Ley de la Uniformidad), al cruzar dos líneas puras homocigotas:',
          'Toda la descendencia F1 es heterocigota e idéntica fenotípicamente',
          'Aparece una proporción 3:1 en la descendencia F1',
          'Los alelos se segregan de forma independiente en la F1',
          'Solo se manifiestan los alelos recesivos',
          'A',
          25,
          'La ley de uniformidad establece que todos los miembros de la F1 son genotípica y fenotípicamente homogéneos.'
        ]
      ];

      const ws = XLSX.utils.aoa_to_sheet(templateData);

      // Set column widths for readability
      ws['!cols'] = [
        { wch: 50 }, // Pregunta
        { wch: 25 }, // Opcion A
        { wch: 25 }, // Opcion B
        { wch: 25 }, // Opcion C
        { wch: 25 }, // Opcion D
        { wch: 28 }, // Correcta
        { wch: 24 }, // Tiempo
        { wch: 55 }  // Explicacion
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Cuestionario');

      if (format === 'xlsx') {
        XLSX.writeFile(wb, 'Plantilla_Preguntas_DocuQuiz.xlsx');
      } else {
        XLSX.writeFile(wb, 'Plantilla_Preguntas_DocuQuiz.csv', { bookType: 'csv' });
      }
    } catch (err) {
      console.error('Error generating template:', err);
      setErrorBanner('No se pudo generar la plantilla Excel. Inténtalo nuevamente.');
    }
  };

  // 2. Parse Uploaded Excel File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorBanner(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Archivo vacío o ilegible.');

        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error('El archivo no contiene ninguna hoja.');

        const sheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (rawJson.length <= 1) {
          throw new Error('El archivo contiene la fila de encabezados pero ninguna pregunta.');
        }

        const rowsToParse = rawJson.slice(1); // skip headers
        const parsedList: ParsedRow[] = [];

        rowsToParse.forEach((row: any[], idx: number) => {
          // If empty row, skip
          if (!row || row.every((c) => !String(c).trim())) return;

          const rowNum = idx + 2; // 1-indexed Excel row
          const qText = String(row[0] || '').trim();
          const optA = String(row[1] || '').trim();
          const optB = String(row[2] || '').trim();
          const optC = String(row[3] || '').trim();
          const optD = String(row[4] || '').trim();
          const rawCorrect = String(row[5] || '').trim().toUpperCase();
          const rawTime = parseInt(String(row[6] || '15'), 10);
          const feedback = String(row[7] || '').trim();

          let correctIndex = -1;
          let correctLetter = 'A';

          // Determine correct index from A, B, C, D or 1, 2, 3, 4
          if (rawCorrect === 'A' || rawCorrect === '1' || rawCorrect === optA.toUpperCase()) {
            correctIndex = 0;
            correctLetter = 'A';
          } else if (rawCorrect === 'B' || rawCorrect === '2' || rawCorrect === optB.toUpperCase()) {
            correctIndex = 1;
            correctLetter = 'B';
          } else if (rawCorrect === 'C' || rawCorrect === '3' || rawCorrect === optC.toUpperCase()) {
            correctIndex = 2;
            correctLetter = 'C';
          } else if (rawCorrect === 'D' || rawCorrect === '4' || rawCorrect === optD.toUpperCase()) {
            correctIndex = 3;
            correctLetter = 'D';
          } else if (rawCorrect.includes('A')) {
            correctIndex = 0;
            correctLetter = 'A';
          } else if (rawCorrect.includes('B')) {
            correctIndex = 1;
            correctLetter = 'B';
          } else if (rawCorrect.includes('C')) {
            correctIndex = 2;
            correctLetter = 'C';
          } else if (rawCorrect.includes('D')) {
            correctIndex = 3;
            correctLetter = 'D';
          }

          let isValid = true;
          let errorMessage = '';

          if (!qText) {
            isValid = false;
            errorMessage = 'Falta el enunciado de la pregunta.';
          } else if (!optA || !optB || !optC || !optD) {
            isValid = false;
            errorMessage = 'Debes completar las 4 alternativas (A, B, C y D).';
          } else if (correctIndex < 0) {
            isValid = false;
            errorMessage = `Opción correcta no válida: "${rawCorrect}". Debe ser A, B, C o D.`;
          }

          const durationSec = !isNaN(rawTime) && rawTime >= 5 && rawTime <= 180 ? rawTime : 15;

          parsedList.push({
            rowNum,
            questionText: qText,
            optionA: optA,
            optionB: optB,
            optionC: optC,
            optionD: optD,
            correctLetter,
            correctIndex: correctIndex >= 0 ? correctIndex : 0,
            durationSec,
            feedback,
            isValid,
            errorMessage: errorMessage || undefined
          });
        });

        if (parsedList.length === 0) {
          throw new Error('No se encontraron filas con preguntas válidas en el archivo Excel.');
        }

        setParsedRows(parsedList);
      } catch (err: unknown) {
        console.error('Error reading Excel file:', err);
        setErrorBanner((err as Error).message || 'Error al procesar el archivo Excel.');
        setParsedRows([]);
      } finally {
        setIsProcessing(false);
        e.target.value = '';
      }
    };

    reader.onerror = () => {
      setErrorBanner('Error al leer el archivo desde el disco.');
      setIsProcessing(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const validQuestions = parsedRows.filter((r) => r.isValid);
  const invalidQuestions = parsedRows.filter((r) => !r.isValid);

  const handleImportQuiz = () => {
    if (validQuestions.length === 0) {
      setErrorBanner('No hay ninguna pregunta válida para importar.');
      return;
    }

    const defaultTime = validQuestions[0]?.durationSec || 15;

    const questions: Question[] = validQuestions.map((row, idx) => ({
      id: `q-excel-${Date.now()}-${idx + 1}`,
      text: row.questionText,
      timePerQuestion: row.durationSec || defaultTime,
      correctOptionIndex: row.correctIndex,
      feedback:
        row.feedback ||
        `La opción correcta es la alternativa ${row.correctLetter}.`,
      explanation: row.feedback || undefined,
      options: [
        {
          id: '0',
          text: row.optionA,
          suit: SUIT_DEFINITIONS[0].suit,
          color: SUIT_DEFINITIONS[0].color,
          symbol: SUIT_DEFINITIONS[0].symbol,
          colorName: SUIT_DEFINITIONS[0].colorName
        },
        {
          id: '1',
          text: row.optionB,
          suit: SUIT_DEFINITIONS[1].suit,
          color: SUIT_DEFINITIONS[1].color,
          symbol: SUIT_DEFINITIONS[1].symbol,
          colorName: SUIT_DEFINITIONS[1].colorName
        },
        {
          id: '2',
          text: row.optionC,
          suit: SUIT_DEFINITIONS[2].suit,
          color: SUIT_DEFINITIONS[2].color,
          symbol: SUIT_DEFINITIONS[2].symbol,
          colorName: SUIT_DEFINITIONS[2].colorName
        },
        {
          id: '3',
          text: row.optionD,
          suit: SUIT_DEFINITIONS[3].suit,
          color: SUIT_DEFINITIONS[3].color,
          symbol: SUIT_DEFINITIONS[3].symbol,
          colorName: SUIT_DEFINITIONS[3].colorName
        }
      ] as [any, any, any, any]
    }));

    const newQuiz: Quiz = {
      id: 'quiz-excel-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      notebookId,
      title: quizTitle.trim() || `Cuestionario Importado (${fileName || 'Excel'})`,
      description: `Cuestionario importado desde archivo Excel (${validQuestions.length} preguntas).`,
      timePerQuestion: defaultTime,
      complexity: 'Medio',
      questions,
      approved: true,
      createdAt: Date.now()
    };

    onQuizImported(newQuiz);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-white">Importar Preguntas desde Excel</h2>
              <p className="text-xs text-slate-400">Descarga la plantilla, digita tus preguntas y sube el archivo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-950/60 border border-rose-800 rounded-2xl text-xs font-semibold text-rose-300 flex items-center gap-2.5 shrink-0 animate-shake">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 1 & Step 2 Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Download Template */}
            <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-mono">
                    1
                  </span>
                  <span>Paso 1: Descargar Plantilla</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Descarga el formato oficial con las 8 columnas requeridas: Enunciado, 4 alternativas (A, B, C, D), Opción Correcta, Tiempo en Segundos y Retroalimentación pedagógica.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('xlsx')}
                  className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar Plantilla (.XLSX)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadTemplate('csv')}
                  className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  title="Descargar versión CSV para Google Sheets"
                >
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Step 2: Upload Completed File */}
            <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-mono">
                    2
                  </span>
                  <span>Paso 2: Cargar Archivo con Preguntas</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mt-2">
                  Selecciona tu archivo (.xlsx, .xls o .csv) con las preguntas completadas. El sistema validará automáticamente cada fila.
                </p>
              </div>

              <label className="py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-2 cursor-pointer">
                <UploadCloud className="w-4 h-4" />
                <span>{fileName ? `Reemplazar: ${fileName}` : 'Cargar Archivo Excel'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Title Config if questions parsed */}
          {parsedRows.length > 0 && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Título del Cuestionario Importado *
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Ej: Cuestionario de Biología Unidad 1"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          )}

          {/* Parsed Questions Preview Table */}
          {parsedRows.length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Vista Previa de Preguntas Detectadas ({parsedRows.length})
                  </h3>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    {validQuestions.length} Válida(s)
                  </span>
                  {invalidQuestions.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                      {invalidQuestions.length} con Error
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {parsedRows.map((r, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition ${
                      r.isValid
                        ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                        : 'bg-rose-950/30 border-rose-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                          {r.questionText || <span className="text-rose-400 italic">Sin enunciado</span>}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
                          {r.durationSec}s
                        </span>
                        <span className="px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30">
                          Correcta: {r.correctLetter}
                        </span>
                      </div>
                    </div>

                    {/* Options Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div
                        className={`p-1.5 rounded-lg border truncate ${
                          r.correctIndex === 0
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title={r.optionA}
                      >
                        <span className="text-rose-400 font-bold mr-1">A:</span> {r.optionA || '-'}
                      </div>
                      <div
                        className={`p-1.5 rounded-lg border truncate ${
                          r.correctIndex === 1
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title={r.optionB}
                      >
                        <span className="text-blue-400 font-bold mr-1">B:</span> {r.optionB || '-'}
                      </div>
                      <div
                        className={`p-1.5 rounded-lg border truncate ${
                          r.correctIndex === 2
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title={r.optionC}
                      >
                        <span className="text-amber-400 font-bold mr-1">C:</span> {r.optionC || '-'}
                      </div>
                      <div
                        className={`p-1.5 rounded-lg border truncate ${
                          r.correctIndex === 3
                            ? 'bg-emerald-950/40 border-emerald-500 text-emerald-200 font-bold'
                            : 'bg-slate-900 border-slate-800 text-slate-400'
                        }`}
                        title={r.optionD}
                      >
                        <span className="text-emerald-400 font-bold mr-1">D:</span> {r.optionD || '-'}
                      </div>
                    </div>

                    {/* Feedback or error message */}
                    {r.errorMessage ? (
                      <p className="text-[11px] text-rose-300 font-semibold mt-2 flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Fila Excel #{r.rowNum}: {r.errorMessage}</span>
                      </p>
                    ) : r.feedback ? (
                      <p className="text-[10px] text-slate-400 mt-2 truncate">
                        <strong className="text-slate-300">Retroalimentación:</strong> {r.feedback}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 border border-dashed border-slate-800 rounded-2xl text-center space-y-2 bg-slate-950/30">
              <FileSpreadsheet className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-xs font-semibold text-slate-400">
                Aún no has cargado un archivo Excel. Descarga la plantilla en el Paso 1 y cárgala en el Paso 2.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400">
            {parsedRows.length > 0 ? (
              <span>
                {validQuestions.length} pregunta(s) lista(s) para importar • {invalidQuestions.length} descartada(s)
              </span>
            ) : (
              <span>Formatos admitidos: .xlsx, .xls, .csv</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold transition cursor-pointer"
            >
              Cerrar
            </button>

            <button
              type="button"
              onClick={handleImportQuiz}
              disabled={validQuestions.length === 0}
              className="flex-1 sm:flex-none px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transform active:scale-95"
            >
              <Eye className="w-4 h-4 fill-current" />
              <span>Importar {validQuestions.length} Pregunta(s) y Revisar</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
