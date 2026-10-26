import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import {
  Notebook,
  DocumentSource,
  Quiz,
  Question,
  QuizOption,
  Player,
  PlayerAnswerRecord,
  GameRoomState,
  LeaderboardEntry,
  GameSessionHistory,
  SUIT_DEFINITIONS
} from './src/types/index.ts';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: false
  },
  transports: ['polling', 'websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true
});

// Enable permissive CORS for mobile and external student clients
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Configure JSON parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Multer for memory upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build'
    }
  }
});

// Persistence helper (cuadernos.json in backend root, mirrored to data/db.json)
const CUADERNOS_FILE = path.resolve(process.cwd(), 'cuadernos.json');
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

function ensureDataDir() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
}

// Initial demo notebook with rich study sources
const INITIAL_NOTEBOOKS: Notebook[] = [
  {
    id: 'nb-biologia-01',
    title: 'Biología Celular: Estructura, Mitosis y Genética',
    description: 'Cuaderno completo sobre organelos celulares, ciclo celular, mitosis y principios de genética mendeliana.',
    createdAt: Date.now() - 86400000 * 2,
    sources: [
      {
        id: 'src-bio-1',
        name: 'Fundamentos de la Célula y Mitosis.txt',
        type: 'txt',
        sizeBytes: 3200,
        uploadedAt: Date.now() - 86400000 * 2,
        charCount: 2850,
        content: `La célula es la unidad morfológica y funcional de todo ser vivo.
Existen dos grandes tipos de células: procariotas (sin núcleo definido, como las bacterias) y eucariotas (con núcleo delimitado por una carioteca, como animales y vegetales).

ORGANELOS PRINCIPALES:
1. Mitocondria: Responsable de la respiración celular y síntesis de ATP (energía) mediante la fosforilación oxidativa. Posee su propio ADN mitocondrial.
2. Cloroplasto: Presente en células vegetales, realiza la fotosíntesis fijando CO2 en glucosa mediante la clorofila en los tilacoides.
3. Ribosomas: Sintetizan proteínas traduciendo el ARN mensajero. Se encuentran libres en el citoplasma o adosados al retículo endoplasmático rugoso.
4. Aparato de Golgi: Empaqueta, procesa y distribuye proteínas y lípidos provenientes del retículo hacia sus destinos celulares o secreción.
5. Lisosomas: Vesículas digestivas con enzimas hidrolíticas ácidas que degradan desechos celulares y patógenos.

EL CICLO CELULAR Y MITOSIS:
El ciclo celular comprende la Interfase (G1, S donde se replica el ADN, G2) y la fase M (Mitosis y Citocinesis).
La Mitosis consta de 4 fases principales:
- Profase: La cromatina se condensa en cromosomas visibles, desaparece el nucléolo y se forma el huso mitótico.
- Metafase: Los cromosomas se alinean en el plano ecuatorial de la célula gracias a las fibras del huso ancladas en los cinetocoros.
- Anafase: Las cromátidas hermanas se separan y migran hacia los polos opuestos de la célula.
- Telofase: Se reorganiza la envoltura nuclear alrededor de cada grupo cromosómico y los cromosomas se descondensan.
La citocinesis divide el citoplasma, resultando en dos células hijas idénticas diploides (2n).`
      },
      {
        id: 'src-bio-2',
        name: 'Genética Mendeliana y ADN.txt',
        type: 'txt',
        sizeBytes: 2400,
        uploadedAt: Date.now() - 86400000,
        charCount: 2150,
        content: `LEYES DE GREGOR MENDEL:
1. Ley de la Uniformidad: Al cruzar dos razas puras homocigotas para un determinado carácter, los descendientes de la primera generación (F1) son todos iguales fenotípica y genotípicamente entre sí.
2. Ley de la Segregación: Durante la formación de los gametos, los alelos de un gen se separan, de modo que cada gameto lleva solo un alelo para cada carácter.
3. Ley de la Transmisión Independiente: Diferentes rasgos son heredados independientemente unos de otros, no existe relación entre ellos (válido para genes en cromosomas no homólogos).

ESTRUCTURA DEL ADN:
El Ácido Desoxirribonucleico (ADN) está constituido por una doble hélice antiparalela descubierta por Watson y Crick.
Los monómeros son nucleótidos formados por un grupo fosfato, una desoxirribosa y una base nitrogenada.
Apareamiento de bases complementarias:
- Adenina (A) se une con Timina (T) mediante 2 puentes de hidrógeno.
- Guanina (G) se une con Citosina (C) mediante 3 puentes de hidrógeno.`
      }
    ],
    quizzes: [
      {
        id: 'quiz-bio-demo',
        notebookId: 'nb-biologia-01',
        title: 'Desafío de Biología Celular y Mitosis',
        description: 'Cuestionario de prueba generado y aprobado con 5 preguntas clave.',
        timePerQuestion: 15,
        complexity: 'Medio',
        approved: true,
        createdAt: Date.now() - 3600000,
        questions: [
          {
            id: 'q-1',
            text: '¿Cuál es el organelo encargado de la respiración celular y generación de ATP?',
            options: [
              { id: '0', text: 'Mitocondria', suit: 'hearts', color: 'red', symbol: '♥', colorName: 'Rojo' },
              { id: '1', text: 'Aparato de Golgi', suit: 'diamonds', color: 'blue', symbol: '♦', colorName: 'Azul' },
              { id: '2', text: 'Ribosoma', suit: 'clubs', color: 'yellow', symbol: '♣', colorName: 'Amarillo' },
              { id: '3', text: 'Lisosoma', suit: 'spades', color: 'green', symbol: '♠', colorName: 'Verde' }
            ],
            correctOptionIndex: 0,
            feedback: 'La mitocondria realiza la fosforilación oxidativa para sintetizar la mayor parte del ATP que la célula necesita para sus funciones metabólicas.'
          },
          {
            id: 'q-2',
            text: 'En la mitosis, ¿en qué fase se alinean los cromosomas en la placa o plano ecuatorial?',
            options: [
              { id: '0', text: 'Profase', suit: 'hearts', color: 'red', symbol: '♥', colorName: 'Rojo' },
              { id: '1', text: 'Metafase', suit: 'diamonds', color: 'blue', symbol: '♦', colorName: 'Azul' },
              { id: '2', text: 'Anafase', suit: 'clubs', color: 'yellow', symbol: '♣', colorName: 'Amarillo' },
              { id: '3', text: 'Telofase', suit: 'spades', color: 'green', symbol: '♠', colorName: 'Verde' }
            ],
            correctOptionIndex: 1,
            feedback: 'Durante la Metafase, los cromosomas condensados se sitúan perfectamente ordenados en el ecuador de la célula mediante las fibras del huso ancladas al cinetocoro.'
          },
          {
            id: 'q-3',
            text: '¿Cuántos puentes de hidrógeno unen a la Guanina (G) y Citosina (C) en la doble hélice de ADN?',
            options: [
              { id: '0', text: '1 puente de hidrógeno', suit: 'hearts', color: 'red', symbol: '♥', colorName: 'Rojo' },
              { id: '1', text: '2 puentes de hidrógeno', suit: 'diamonds', color: 'blue', symbol: '♦', colorName: 'Azul' },
              { id: '2', text: '4 puentes de hidrógeno', suit: 'clubs', color: 'yellow', symbol: '♣', colorName: 'Amarillo' },
              { id: '3', text: '3 puentes de hidrógeno', suit: 'spades', color: 'green', symbol: '♠', colorName: 'Verde' }
            ],
            correctOptionIndex: 3,
            feedback: 'El par Guanina-Citosina se une mediante 3 puentes de hidrógeno (a diferencia de Adenina-Timina que se unen con 2), haciéndolo más termodinámicamente estable.'
          },
          {
            id: 'q-4',
            text: '¿En qué etapa de la interfase ocurre la replicación y duplicación del ADN?',
            options: [
              { id: '0', text: 'Fase G1', suit: 'hearts', color: 'red', symbol: '♥', colorName: 'Rojo' },
              { id: '1', text: 'Fase S (Síntesis)', suit: 'diamonds', color: 'blue', symbol: '♦', colorName: 'Azul' },
              { id: '2', text: 'Fase G2', suit: 'clubs', color: 'yellow', symbol: '♣', colorName: 'Amarillo' },
              { id: '3', text: 'Fase M (Mitosis)', suit: 'spades', color: 'green', symbol: '♠', colorName: 'Verde' }
            ],
            correctOptionIndex: 1,
            feedback: 'En la fase S (Síntesis) de la interfase celular, el material genético se duplica de modo que cada cromosoma queda constituido por dos cromátidas hermanas idénticas.'
          },
          {
            id: 'q-5',
            text: '¿Qué organelo contiene enzimas hidrolíticas para digerir desechos celulares y patógenos?',
            options: [
              { id: '0', text: 'Cloroplasto', suit: 'hearts', color: 'red', symbol: '♥', colorName: 'Rojo' },
              { id: '1', text: 'Retículo Liso', suit: 'diamonds', color: 'blue', symbol: '♦', colorName: 'Azul' },
              { id: '2', text: 'Lisosoma', suit: 'clubs', color: 'yellow', symbol: '♣', colorName: 'Amarillo' },
              { id: '3', text: 'Centrosoma', suit: 'spades', color: 'green', symbol: '♠', colorName: 'Verde' }
            ],
            correctOptionIndex: 2,
            feedback: 'Los lisosomas funcionan como el sistema digestivo de la célula, degradando sustancias endocitadas y componentes celulares viejos mediante autofagia.'
          }
        ]
      }
    ],
    history: []
  },
  {
    id: 'nb-1792499359758-ykprp',
    title: 'TALLER MRP',
    description: 'Cuaderno de estudio sobre Planificación de Requerimientos de Materiales (MRP).',
    createdAt: Date.now() - 86400000,
    sources: [
      {
        id: 'src-1792499451907-h046',
        name: 'MRP - Importancia.pdf',
        type: 'pdf',
        sizeBytes: 183701,
        content: 'Planificación de Requerimientos de Materiales (MRP): Conceptos, lista de materiales (BOM) y programas maestros.',
        charCount: 110,
        uploadedAt: Date.now() - 86400000
      }
    ],
    quizzes: [],
    history: []
  }
];

let notebooks: Notebook[] = [];

// Asynchronously saves all notebooks to cuadernos.json in the backend root
async function saveCuadernos(data: Notebook[]): Promise<void> {
  const jsonContent = JSON.stringify(data, null, 2);
  // Write asynchronously using fsPromises.writeFile
  await fsPromises.writeFile(CUADERNOS_FILE, jsonContent, 'utf-8');
  try {
    ensureDataDir();
    await fsPromises.writeFile(DB_FILE, jsonContent, 'utf-8');
  } catch (mirrorErr) {
    console.warn('Mirror to db.json warning:', mirrorErr);
  }
}

// Backwards-compatible synchronous alias
function saveData(data: Notebook[]) {
  const jsonContent = JSON.stringify(data, null, 2);
  try {
    fs.writeFileSync(CUADERNOS_FILE, jsonContent, 'utf-8');
    ensureDataDir();
    fs.writeFileSync(DB_FILE, jsonContent, 'utf-8');
  } catch (err) {
    console.error('Error in synchronous saveData:', err);
  }
}

// Asynchronously loads all notebooks from cuadernos.json in the backend root
async function loadCuadernos(): Promise<Notebook[]> {
  try {
    if (fs.existsSync(CUADERNOS_FILE)) {
      const raw = await fsPromises.readFile(CUADERNOS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } else if (fs.existsSync(DB_FILE)) {
      const raw = await fsPromises.readFile(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await saveCuadernos(parsed);
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading cuadernos.json:', err);
  }
  await saveCuadernos(INITIAL_NOTEBOOKS);
  return INITIAL_NOTEBOOKS;
}

// Synchronous loader for initial top-level state
function loadCuadernosSync(): Notebook[] {
  try {
    if (fs.existsSync(CUADERNOS_FILE)) {
      const raw = fs.readFileSync(CUADERNOS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } else if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        fs.writeFileSync(CUADERNOS_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error in loadCuadernosSync:', err);
  }
  try {
    fs.writeFileSync(CUADERNOS_FILE, JSON.stringify(INITIAL_NOTEBOOKS, null, 2), 'utf-8');
  } catch {}
  return INITIAL_NOTEBOOKS;
}

notebooks = loadCuadernosSync();

// Helper to extract text from files (PDF, Word, Excel, PPTX/PPT, Text)
async function extractTextFromBuffer(buffer: Buffer, originalName: string, mimeType: string): Promise<string> {
  const ext = path.extname(originalName).toLowerCase();
  
  // 1. Excel / Spreadsheet files (.xlsx, .xls, .csv)
  if (ext === '.xlsx' || ext === '.xls' || ext === '.csv' || mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetTexts: string[] = [];
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) continue;
        const csvContent = XLSX.utils.sheet_to_csv(sheet);
        if (csvContent && csvContent.trim()) {
          sheetTexts.push(`[Hoja: ${sheetName}]\n${csvContent.trim()}`);
        }
      }
      if (sheetTexts.length > 0) {
        return sheetTexts.join('\n\n');
      }
    } catch (xlsxErr) {
      console.warn('Error extracting Excel with sheetjs:', xlsxErr);
    }
  }

  // 2. PDF Documents
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    let extractedText = '';

    // Step A: Robust local PDF parser using PDFParse with Uint8Array and verbosity 0
    try {
      const pdfParseModule = await import('pdf-parse');
      if (pdfParseModule.PDFParse) {
        const parser = new pdfParseModule.PDFParse({
          data: new Uint8Array(buffer),
          verbosity: 0
        });
        const res = await parser.getText();
        if (res && typeof res.text === 'string' && res.text.trim().length > 10) {
          extractedText = res.text.trim();
        }
      } else if (typeof (pdfParseModule as any).default === 'function') {
        const parsed = await (pdfParseModule as any).default(buffer);
        if (parsed && typeof parsed.text === 'string' && parsed.text.trim().length > 10) {
          extractedText = parsed.text.trim();
        }
      }
    } catch (parseErr) {
      console.warn('Standard pdf-parse notice:', parseErr);
    }

    if (extractedText) {
      return extractedText;
    }

    // Step B: Stream text regex extraction (handles raw text objects in uncompressed or standard streams)
    try {
      const raw = buffer.toString('latin1');
      const textMatches = raw.match(/\(([^()]{2,})\)\s*T[jd]/g);
      if (textMatches && textMatches.length > 0) {
        const clean = textMatches
          .map((m: string) => m.replace(/^\(|\)\s*T[jd]$/g, '').trim())
          .filter((t) => t.length > 1)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (clean.length > 30) {
          return clean;
        }
      }
    } catch (regexErr) {
      console.warn('PDF regex fallback notice:', regexErr);
    }

    // Step C: Gemini Multimodal Fallback (reads scanned, OCR, or complex graphical PDFs)
    try {
      if (process.env.GEMINI_API_KEY) {
        console.log('Using Gemini 3.8 Flash to extract text from PDF directly...');
        const base64Pdf = buffer.toString('base64');
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: [
            {
              inlineData: {
                mimeType: 'application/pdf',
                data: base64Pdf
              }
            },
            'Extrae y transcribe de forma completa y estructurada todo el texto de este documento PDF respetando conceptos, definiciones, listas y títulos, para servir como material de estudio pedagógico en la generación de cuestionarios.'
          ]
        });
        const aiText = geminiRes.text?.trim() || '';
        if (aiText && aiText.length > 20) {
          return aiText;
        }
      }
    } catch (geminiErr) {
      console.warn('Gemini PDF extraction warning (using fallback summary):', geminiErr);
    }

    return `Documento de estudio PDF cargado: "${originalName}". Contiene esquemas, texto o gráficos preparados para la evaluación.`;
  }

  // 3. Microsoft Word Documents (.docx, .doc)
  if (ext === '.docx' || ext === '.doc' || mimeType.includes('word') || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    if (ext === '.docx') {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        if (result.value && result.value.trim()) {
          return result.value.trim();
        }
      } catch (err) {
        console.warn('Error in mammoth docx extraction, attempting fallback:', err);
      }
    }
    // Binary or fallback text extraction for doc
    const raw = buffer.toString('utf-8');
    const printable = raw.replace(/[^\x20-\x7E\u00A0-\u024F\u0400-\u04FF\n\r]/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (printable.length > 30) {
      return printable.slice(0, 40000);
    }
    return `Documento Microsoft Word procesado: "${originalName}". Texto de referencia para estudio y evaluación.`;
  }

  // 4. PowerPoint Presentations (.pptx / .ppt)
  if (ext === '.pptx' || ext === '.ppt' || mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
    try {
      const JSZipModule = await import('jszip');
      const JSZip = (JSZipModule as any).default || JSZipModule;
      const zip = await JSZip.loadAsync(buffer);
      
      const slideFiles = Object.keys(zip.files).filter(name =>
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      );

      // Sort slides in natural order (slide1, slide2, slide10...)
      slideFiles.sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, ''), 10) || 0;
        return numA - numB;
      });

      const slidesContent: string[] = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const file = zip.files[slideFiles[i]];
        const xml = await file.async('text');
        const textMatches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g);
        if (textMatches && textMatches.length > 0) {
          const slideText = textMatches
            .map((m: string) => m.replace(/<[^>]+>/g, '').trim())
            .filter(Boolean)
            .join(' ');
          if (slideText) {
            slidesContent.push(`[Diapositiva ${i + 1}]\n${slideText}`);
          }
        }
      }

      if (slidesContent.length > 0) {
        return slidesContent.join('\n\n');
      }
    } catch (pptxErr) {
      console.warn('Error extracting PPTX via jszip, attempting fallback:', pptxErr);
    }

    // Fallback extraction for binary PPT or slides
    const raw = buffer.toString('utf-8');
    const printable = raw.replace(/[^\x20-\x7E\u00A0-\u024F\u0400-\u04FF\n\r]/g, ' ').replace(/\s{2,}/g, ' ').trim();
    if (printable.length > 30) {
      return printable.slice(0, 30000);
    }

    return `Presentación PowerPoint procesada: "${originalName}". Diapositivas preparadas para estudio.`;
  }

  // 5. Plain text, markdown, csv, json, code files
  try {
    const text = buffer.toString('utf-8').trim();
    if (text) return text;
  } catch {}
  return `Fuente documental procesada: "${originalName}". Contenido de referencia para preguntas.`;
}

// REST API ROUTES
app.get(['/api/notebooks', '/api/cuadernos'], async (req, res) => {
  try {
    if (fs.existsSync(CUADERNOS_FILE)) {
      const raw = await fsPromises.readFile(CUADERNOS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        notebooks = parsed;
      }
    }
  } catch (e) {
    // Return in-memory notebooks if read fails
  }
  res.json(notebooks);
});

app.post(['/api/notebooks', '/api/cuadernos'], async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'El título del cuaderno es obligatorio' });
    }

    // Refresh notebooks array from file first
    try {
      if (fs.existsSync(CUADERNOS_FILE)) {
        const raw = await fsPromises.readFile(CUADERNOS_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) notebooks = parsed;
      }
    } catch {}

    const newNotebook: Notebook = {
      id: 'nb-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: title.trim(),
      description: (description || '').trim(),
      sources: [],
      quizzes: [],
      history: [],
      createdAt: Date.now()
    };

    notebooks.unshift(newNotebook);
    // Asynchronously write to cuadernos.json BEFORE responding to the client
    await saveCuadernos(notebooks);
    console.log(`[Cuadernos] Created notebook "${newNotebook.title}" (${newNotebook.id}). Total: ${notebooks.length}`);
    res.status(201).json(newNotebook);
  } catch (err: unknown) {
    console.error('Error creating notebook:', err);
    res.status(500).json({ error: 'Error al crear el cuaderno', details: (err as Error).message });
  }
});

app.get(['/api/notebooks/:id', '/api/cuadernos/:id'], async (req, res) => {
  const nb = notebooks.find(n => n.id === req.params.id);
  if (!nb) return res.status(404).json({ error: 'Cuaderno no encontrado' });
  res.json(nb);
});

app.delete(['/api/notebooks/:id', '/api/cuadernos/:id'], async (req, res) => {
  try {
    notebooks = notebooks.filter(n => n.id !== req.params.id);
    await saveCuadernos(notebooks);
    console.log(`[Cuadernos] Deleted notebook ${req.params.id}. Remaining: ${notebooks.length}`);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Error al eliminar el cuaderno', details: (err as Error).message });
  }
});

// Upload Document Sources (PDF, Word, Excel, PPTX, TXT, or direct text note)
app.post(['/api/notebooks/:id/sources', '/api/cuadernos/:id/sources', '/api/cuadernos/:id/fuentes'], upload.single('file'), async (req, res) => {
  try {
    const notebook = notebooks.find(n => n.id === req.params.id);
    if (!notebook) return res.status(404).json({ error: 'Cuaderno no encontrado' });

    let name = 'Nota de texto';
    let type: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'txt' | 'note' | 'notebooklm' = 'note';
    let content = '';
    let sizeBytes = 0;

    if (req.file) {
      // Decode original name properly if encoded as latin1
      let rawName = req.file.originalname;
      try {
        name = Buffer.from(rawName, 'latin1').toString('utf8');
      } catch {
        name = rawName;
      }
      sizeBytes = req.file.size;
      const ext = path.extname(name).toLowerCase();
      if (ext === '.pdf') type = 'pdf';
      else if (ext === '.docx' || ext === '.doc') type = 'docx';
      else if (ext === '.pptx' || ext === '.ppt') type = 'pptx';
      else if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') type = 'xlsx';
      else type = 'txt';

      content = await extractTextFromBuffer(req.file.buffer, name, req.file.mimetype);
    } else if (req.body && req.body.content) {
      content = req.body.content;
      name = req.body.name || `Nota manual (${new Date().toLocaleDateString()})`;
      type = (req.body.type as any) || 'note';
      sizeBytes = Buffer.byteLength(content, 'utf8');
    } else {
      return res.status(400).json({ error: 'No se envió ningún archivo ni contenido de texto.' });
    }

    if (!content || !content.trim()) {
      content = `Documento de estudio "${name}" agregado al cuaderno para referencia y generación de cuestionarios.`;
    }

    const newSource: DocumentSource = {
      id: 'src-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name,
      type,
      sizeBytes,
      content,
      charCount: content.length,
      uploadedAt: Date.now(),
      notebookLmUrl: req.body?.notebookLmUrl
    };

    notebook.sources.push(newSource);
    // Write asynchronously before responding!
    await saveCuadernos(notebooks);
    console.log(`[Cuadernos] Added source "${newSource.name}" to notebook ${notebook.id}`);
    res.status(201).json(newSource);
  } catch (err: unknown) {
    console.error('Error adding source:', err);
    res.status(500).json({ error: 'Error al procesar el documento', details: (err as Error).message });
  }
});

// Connect / Import from NotebookLM
app.post(['/api/notebooks/:id/notebooklm', '/api/cuadernos/:id/notebooklm'], async (req, res) => {
  try {
    const notebook = notebooks.find(n => n.id === req.params.id);
    if (!notebook) return res.status(404).json({ error: 'Cuaderno no encontrado' });

    const { name, content, notebookLmUrl } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'El contenido de NotebookLM (resumen, notas o guía de estudio) es obligatorio.' });
    }

    const sourceName = (name || '').trim() || 'Guía de Estudio NotebookLM';
    const cleanContent = content.trim();

    const newSource: DocumentSource = {
      id: 'src-nlm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      name: sourceName,
      type: 'notebooklm',
      sizeBytes: Buffer.byteLength(cleanContent, 'utf8'),
      content: cleanContent,
      charCount: cleanContent.length,
      uploadedAt: Date.now(),
      notebookLmUrl: (notebookLmUrl || '').trim() || undefined
    };

    notebook.sources.push(newSource);
    await saveCuadernos(notebooks);
    res.status(201).json(newSource);
  } catch (err: unknown) {
    console.error('Error adding NotebookLM source:', err);
    res.status(500).json({ error: 'Error al importar fuente de NotebookLM', details: (err as Error).message });
  }
});

app.delete(['/api/notebooks/:id/sources/:sourceId', '/api/cuadernos/:id/sources/:sourceId', '/api/cuadernos/:id/fuentes/:sourceId'], async (req, res) => {
  try {
    const notebook = notebooks.find(n => n.id === req.params.id);
    if (!notebook) return res.status(404).json({ error: 'Cuaderno no encontrado' });
    notebook.sources = notebook.sources.filter(s => s.id !== req.params.sourceId);
    await saveCuadernos(notebooks);
    res.json({ success: true, sources: notebook.sources });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Error al eliminar fuente', details: (err as Error).message });
  }
});

// AI Quiz Generation endpoint using Gemini 3.8 Flash
app.post(['/api/notebooks/:id/generate-quiz', '/api/cuadernos/:id/generate-quiz', '/api/cuadernos/:id/generar-cuestionario'], async (req, res) => {
  try {
    const notebook = notebooks.find(n => n.id === req.params.id);
    if (!notebook) return res.status(404).json({ error: 'Cuaderno no encontrado' });

    const {
      numQuestions = 5,
      timePerQuestion = 15,
      complexity = 'Medio',
      customTopic = '',
      usePromptOnly = false
    } = req.body;

    const hasSources = Array.isArray(notebook.sources) && notebook.sources.length > 0;
    const cleanTopic = (customTopic || '').trim();

    if (!hasSources && !cleanTopic) {
      return res.status(400).json({
        error: 'Para generar un cuestionario sin fuentes, por favor escribe el tema o prompt sobre el cual deseas que la IA formule las preguntas.'
      });
    }

    const isPromptOnly = usePromptOnly || !hasSources;

    let systemInstruction = '';
    let userPrompt = '';

    if (isPromptOnly) {
      // AI generation purely from prompt/topic without sources
      systemInstruction = `Eres un experto pedagógico y diseñador instruccional de cuestionarios de alta calidad para juegos interactivos en vivo tipo Kahoot.
Tu tarea es generar exactamente ${numQuestions} preguntas de opción múltiple sobre el tema o instrucción solicitada: "${cleanTopic || notebook.title}".

REGLAS PEDAGÓGICAS OBLIGATORIAS:
1. Cada pregunta DEBE tener EXACTAMENTE 4 alternativas de respuesta (índices 0, 1, 2, 3).
2. Solo UNA de las 4 opciones debe ser la correcta. El índice 'correctOptionIndex' debe ser un número entero entre 0 y 3.
3. Las alternativas incorrectas (distractores) deben ser plausibles y desafiantes, pero claramente diferenciables de la correcta.
4. Las 4 opciones deben ser concisas y legibles rápidamente en una pantalla de proyector (máximo 12 a 15 palabras por opción).
5. Incluye un campo 'feedback' (retroalimentación didáctica) explicando de forma clara, didáctica y enriquecedora POR QUÉ esa opción es la correcta y el concepto clave involucrado.
6. El nivel de complejidad debe ser: ${complexity}.
7. Genera un título atractivo y pedagógico para el cuestionario ('quizTitle').
8. Responde EXCLUSIVAMENTE en formato JSON válido según el esquema solicitado.`;

      userPrompt = `Tema del cuestionario: "${cleanTopic || notebook.title}".
Genera exactamente ${numQuestions} preguntas de opción múltiple de nivel ${complexity} con 4 opciones y retroalimentación pedagógica.`;
    } else {
      // Generation based on notebook sources
      let combinedSources = notebook.sources
        .map((s, idx) => `=== FUENTE ${idx + 1}: ${s.name} ===\n${s.content}`)
        .join('\n\n');

      if (combinedSources.length > 80000) {
        combinedSources = combinedSources.substring(0, 80000) + '\n\n[...Texto truncado para optimización...]';
      }

      systemInstruction = `Eres un experto pedagógico y diseñador instruccional de cuestionarios de alta calidad para juegos tipo Kahoot.
Tu tarea es leer las fuentes de estudio proporcionadas y generar exactamente ${numQuestions} preguntas de opción múltiple basadas ESTRICTAMENTE en la información de los documentos.

REGLAS OBLIGATORIAS:
1. Cada pregunta DEBE tener EXACTAMENTE 4 alternativas de respuesta (índices 0, 1, 2, 3).
2. Solo UNA de las 4 opciones debe ser la correcta. El índice 'correctOptionIndex' debe ser un número entero entre 0 y 3.
3. Las alternativas incorrectas (distractores) deben ser plausibles pero claramente erróneas según el texto.
4. Las 4 opciones deben ser concisas y legibles en una pantalla de proyector (máximo 12 a 15 palabras por opción).
5. Incluye un campo 'feedback' (retroalimentación didáctica) explicando de forma clara, didáctica y basada en la fuente POR QUÉ esa opción es la correcta y desmintiendo el error común.
6. El nivel de complejidad debe ser: ${complexity}.
${cleanTopic ? `7. Enfócate preferentemente en el subtema o aspecto: "${cleanTopic}".` : ''}
8. Responde EXCLUSIVAMENTE en formato JSON válido según el esquema solicitado.`;

      userPrompt = `A continuación se presentan las fuentes de estudio del cuaderno "${notebook.title}":

${combinedSources}

Genera exactamente ${numQuestions} preguntas de opción múltiple con 4 alternativas y retroalimentación didáctica.`;
    }

    let response: any = null;
    let lastGenErr: any = null;

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction,
            temperature: 0.4,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                quizTitle: {
                  type: Type.STRING,
                  description: 'Título atractivo para el cuestionario'
                },
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      questionText: {
                        type: Type.STRING,
                        description: 'Enunciado de la pregunta'
                      },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'Array con exactamente 4 opciones de respuesta'
                      },
                      correctOptionIndex: {
                        type: Type.INTEGER,
                        description: 'Índice de la respuesta correcta (0, 1, 2 o 3)'
                      },
                      feedback: {
                        type: Type.STRING,
                        description: 'Explicación didáctica de por qué es correcta'
                      }
                    },
                    required: ['questionText', 'options', 'correctOptionIndex', 'feedback']
                  }
                }
              },
              required: ['quizTitle', 'questions']
            }
          }
        });
        if (response && response.text) break;
      } catch (err: any) {
        lastGenErr = err;
        console.warn(`Attempt with ${modelName} encountered issue, trying fallback:`, err?.message);
        await new Promise((r) => setTimeout(r, 700));
      }
    }

    if (!response || !response.text) {
      throw lastGenErr || new Error('No se pudo generar el cuestionario con Gemini.');
    }

    const rawJson = response.text?.trim() || '{}';
    const parsed = JSON.parse(rawJson);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('La respuesta de Gemini no incluyó preguntas válidas');
    }

    // Transform into standard Question model with suits and colors
    const generatedQuestions: Question[] = parsed.questions.map((q: any, qIdx: number) => {
      const opts = (Array.isArray(q.options) && q.options.length >= 4)
        ? q.options.slice(0, 4)
        : [
            q.options?.[0] || 'Opción A',
            q.options?.[1] || 'Opción B',
            q.options?.[2] || 'Opción C',
            q.options?.[3] || 'Opción D'
          ];

      const optionsFormatted: [QuizOption, QuizOption, QuizOption, QuizOption] = [
        {
          id: '0',
          text: String(opts[0]).trim(),
          suit: SUIT_DEFINITIONS[0].suit,
          color: SUIT_DEFINITIONS[0].color,
          symbol: SUIT_DEFINITIONS[0].symbol,
          colorName: SUIT_DEFINITIONS[0].colorName
        },
        {
          id: '1',
          text: String(opts[1]).trim(),
          suit: SUIT_DEFINITIONS[1].suit,
          color: SUIT_DEFINITIONS[1].color,
          symbol: SUIT_DEFINITIONS[1].symbol,
          colorName: SUIT_DEFINITIONS[1].colorName
        },
        {
          id: '2',
          text: String(opts[2]).trim(),
          suit: SUIT_DEFINITIONS[2].suit,
          color: SUIT_DEFINITIONS[2].color,
          symbol: SUIT_DEFINITIONS[2].symbol,
          colorName: SUIT_DEFINITIONS[2].colorName
        },
        {
          id: '3',
          text: String(opts[3]).trim(),
          suit: SUIT_DEFINITIONS[3].suit,
          color: SUIT_DEFINITIONS[3].color,
          symbol: SUIT_DEFINITIONS[3].symbol,
          colorName: SUIT_DEFINITIONS[3].colorName
        }
      ];

      const correctIdx = typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex <= 3
        ? q.correctOptionIndex
        : 0;

      const qDuration = Math.max(5, Math.min(180, Number(timePerQuestion) || 15));
      return {
        id: `q-${Date.now()}-${qIdx + 1}`,
        text: String(q.questionText || `Pregunta ${qIdx + 1}`).trim(),
        options: optionsFormatted,
        correctOptionIndex: correctIdx,
        feedback: String(q.feedback || 'Respuesta basada en los documentos del cuaderno.').trim(),
        timePerQuestion: qDuration
      };
    });

    const parsedDuration = Math.max(5, Math.min(180, Number(timePerQuestion) || 15));

    const newQuiz: Quiz = {
      id: 'quiz-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      notebookId: notebook.id,
      title: parsed.quizTitle || `Cuestionario: ${notebook.title}`,
      description: `Generado con IA (${complexity}) a partir de ${notebook.sources.length} fuente(s).`,
      timePerQuestion: parsedDuration,
      complexity: complexity as 'Fácil' | 'Medio' | 'Difícil',
      questions: generatedQuestions,
      approved: false, // Must be reviewed and approved by the admin
      createdAt: Date.now()
    };

    // Return to the admin for review (client will show review screen)
    res.json(newQuiz);
  } catch (err: unknown) {
    console.error('Error generating quiz with Gemini:', err);
    const rawMsg = (err as Error).message || '';
    let userMsg = 'Error al generar el cuestionario con IA';
    if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
      userMsg = 'El servicio de IA de Google experimenta alta demanda momentánea. Intenta de nuevo en unos segundos, o utiliza las opciones "Redactar Manualmente" o "Cargar desde Excel" para continuar de inmediato.';
    } else if (rawMsg) {
      userMsg = `Error de IA: ${rawMsg}`;
    }
    res.status(500).json({
      error: userMsg,
      details: userMsg
    });
  }
});

// Save or Approve Quiz
app.post(['/api/notebooks/:id/quizzes', '/api/cuadernos/:id/quizzes', '/api/cuadernos/:id/cuestionarios'], async (req, res) => {
  try {
    const notebook = notebooks.find(n => n.id === req.params.id);
    if (!notebook) return res.status(404).json({ error: 'Cuaderno no encontrado' });

    const quizData: Quiz = req.body;
    if (!quizData || !quizData.title || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      return res.status(400).json({ error: 'El cuestionario debe tener un título y al menos 1 pregunta.' });
    }

    // Ensure options have correct suit definitions
    quizData.questions.forEach((q) => {
      [0, 1, 2, 3].forEach((idx) => {
        if (!q.options[idx]) {
          q.options[idx] = {
            id: String(idx),
            text: `Opción ${idx + 1}`,
            suit: SUIT_DEFINITIONS[idx].suit,
            color: SUIT_DEFINITIONS[idx].color,
            symbol: SUIT_DEFINITIONS[idx].symbol,
            colorName: SUIT_DEFINITIONS[idx].colorName
          };
        } else {
          q.options[idx].suit = SUIT_DEFINITIONS[idx].suit;
          q.options[idx].color = SUIT_DEFINITIONS[idx].color;
          q.options[idx].symbol = SUIT_DEFINITIONS[idx].symbol;
          q.options[idx].colorName = SUIT_DEFINITIONS[idx].colorName;
        }
      });
    });

    const existingIdx = notebook.quizzes.findIndex(q => q.id === quizData.id);
    if (existingIdx >= 0) {
      notebook.quizzes[existingIdx] = quizData;
    } else {
      notebook.quizzes.unshift(quizData);
    }

    // Asynchronously write to cuadernos.json before responding!
    await saveCuadernos(notebooks);
    console.log(`[Cuadernos] Saved quiz "${quizData.title}" (${quizData.id}) in notebook ${notebook.id}`);
    res.json(quizData);
  } catch (err: unknown) {
    res.status(500).json({ error: 'Error al guardar cuestionario', details: (err as Error).message });
  }
});

// Delete Quiz
app.delete(['/api/notebooks/:id/quizzes/:quizId', '/api/cuadernos/:id/quizzes/:quizId', '/api/cuadernos/:id/cuestionarios/:quizId'], async (req, res) => {
  try {
    const notebook = notebooks.find(n => n.id === req.params.id);
    if (!notebook) return res.status(404).json({ error: 'Cuaderno no encontrado' });
    notebook.quizzes = notebook.quizzes.filter(q => q.id !== req.params.quizId);
    await saveCuadernos(notebooks);
    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Error al eliminar cuestionario', details: (err as Error).message });
  }
});

// Save Game History into Notebook
app.post(['/api/notebooks/:id/history', '/api/cuadernos/:id/history', '/api/cuadernos/:id/historial'], async (req, res) => {
  try {
    const notebook = notebooks.find(n => n.id === req.params.id);
    if (!notebook) return res.status(404).json({ error: 'Cuaderno no encontrado' });

    const historyEntry: GameSessionHistory = req.body;
    if (!historyEntry || !historyEntry.id) {
      return res.status(400).json({ error: 'Datos de sesión histórica inválidos' });
    }

    if (!notebook.history) {
      notebook.history = [];
    }

    const existingIdx = notebook.history.findIndex(h => h.id === historyEntry.id);
    if (existingIdx >= 0) {
      notebook.history[existingIdx] = historyEntry;
    } else {
      notebook.history.unshift(historyEntry);
    }
    await saveCuadernos(notebooks);
    res.json({ success: true, history: notebook.history });
  } catch (err: unknown) {
    res.status(500).json({ error: 'Error al guardar historial', details: (err as Error).message });
  }
});

// ==========================================
// SOCKET.IO REAL-TIME GAME ENGINE
// ==========================================

interface ActiveRoom {
  roomCode: string;
  adminSocketId: string;
  quiz: Quiz;
  phase: GameRoomState['phase'];
  currentQuestionIndex: number;
  questionStartTime: number | null;
  players: Map<string, Player>; // socketId -> Player
  answers: Map<number, Map<string, PlayerAnswerRecord>>; // questionIndex -> (playerId -> Record)
  autoTimer: NodeJS.Timeout | null;
}

interface SerializedRoom {
  roomCode: string;
  adminSocketId: string;
  quiz: Quiz;
  phase: GameRoomState['phase'];
  currentQuestionIndex: number;
  questionStartTime: number | null;
  players: [string, Player][];
  answers: [number, [string, PlayerAnswerRecord][]][];
  updatedAt: number;
}

const ROOMS_FILE = path.join(DB_DIR, 'active_rooms.json');
const activeRooms = new Map<string, ActiveRoom>();

function serializeRoom(room: ActiveRoom): SerializedRoom {
  return {
    roomCode: String(room.roomCode).trim().replace(/\s+/g, '').toUpperCase(),
    adminSocketId: room.adminSocketId || '',
    quiz: room.quiz,
    phase: room.phase,
    currentQuestionIndex: room.currentQuestionIndex,
    questionStartTime: room.questionStartTime,
    players: Array.from(room.players.entries()),
    answers: Array.from(room.answers.entries()).map(([qIdx, ansMap]) => [
      qIdx,
      Array.from(ansMap.entries())
    ]),
    updatedAt: Date.now()
  };
}

function deserializeRoom(sr: SerializedRoom): ActiveRoom {
  const playersMap = new Map<string, Player>(sr.players || []);
  const answersMap = new Map<number, Map<string, PlayerAnswerRecord>>();
  if (Array.isArray(sr.answers)) {
    for (const [qIdx, list] of sr.answers) {
      answersMap.set(qIdx, new Map(list));
    }
  }

  return {
    roomCode: String(sr.roomCode).trim().replace(/\s+/g, '').toUpperCase(),
    adminSocketId: sr.adminSocketId || '',
    quiz: sr.quiz,
    phase: sr.phase || 'lobby',
    currentQuestionIndex: typeof sr.currentQuestionIndex === 'number' ? sr.currentQuestionIndex : -1,
    questionStartTime: sr.questionStartTime || null,
    players: playersMap,
    answers: answersMap,
    autoTimer: null
  };
}

export function saveActiveRoomsToDisk() {
  try {
    ensureDataDir();
    const roomsList = Array.from(activeRooms.values()).map(serializeRoom);
    fs.writeFileSync(ROOMS_FILE, JSON.stringify(roomsList, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving active_rooms.json:', err);
  }
}

export function loadActiveRoomsFromDisk() {
  try {
    ensureDataDir();
    if (fs.existsSync(ROOMS_FILE)) {
      const raw = fs.readFileSync(ROOMS_FILE, 'utf-8');
      const parsed: SerializedRoom[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const sr of parsed) {
          if (!sr.roomCode) continue;
          const code = String(sr.roomCode).trim().replace(/\s+/g, '').toUpperCase();
          const existing = activeRooms.get(code);
          if (!existing) {
            activeRooms.set(code, deserializeRoom(sr));
          } else {
            existing.phase = sr.phase;
            existing.currentQuestionIndex = sr.currentQuestionIndex;
            existing.questionStartTime = sr.questionStartTime;
            if (Array.isArray(sr.players)) {
              for (const [sId, p] of sr.players) {
                if (!existing.players.has(sId)) {
                  existing.players.set(sId, p);
                }
              }
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error loading active_rooms.json:', err);
  }
}

// Robust lookup for room PIN (strips all whitespace, exact string comparison, disk fallback)
function findRoomByPin(inputPin: any): ActiveRoom | undefined {
  if (inputPin === undefined || inputPin === null) return undefined;
  const cleanCode = String(inputPin).trim().replace(/\s+/g, '').toUpperCase();
  if (!cleanCode) return undefined;

  // 1. Direct key match in memory
  let room = activeRooms.get(cleanCode);
  if (room) return room;

  // 2. Iterate memory ensuring string-exact comparison
  for (const [code, r] of activeRooms.entries()) {
    const normKey = String(code).trim().replace(/\s+/g, '').toUpperCase();
    const normRoomCode = String(r.roomCode).trim().replace(/\s+/g, '').toUpperCase();
    if (normKey === cleanCode || normRoomCode === cleanCode) {
      return r;
    }
  }

  // 3. Fallback: reload from active_rooms.json persistent file cache
  loadActiveRoomsFromDisk();
  room = activeRooms.get(cleanCode);
  if (room) return room;

  for (const [code, r] of activeRooms.entries()) {
    const normKey = String(code).trim().replace(/\s+/g, '').toUpperCase();
    const normRoomCode = String(r.roomCode).trim().replace(/\s+/g, '').toUpperCase();
    if (normKey === cleanCode || normRoomCode === cleanCode) {
      return r;
    }
  }

  return undefined;
}

// Generate short clean 6-digit room PIN as exact string
function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  if (findRoomByPin(code)) return generateRoomCode();
  return code;
}

// Compute strict ranking according to requirement 3:
// 1. Mayor cantidad de Puntos Obtenidos (descendente)
// 2. A igual cantidad de puntos, menor Tiempo Acumulado en segundos (ascendente, premia la velocidad)
function computeLeaderboard(players: Player[]): LeaderboardEntry[] {
  const sorted = [...players].sort((a, b) => {
    // 1st Priority: Points obtained (descending)
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 2nd Priority: Total accumulated time (ascending)
    if (a.totalTime !== b.totalTime) {
      return a.totalTime - b.totalTime;
    }
    // Secondary tie-breaker: Alphabetical by Last name, then First name
    return a.fullName.localeCompare(b.fullName);
  });

  return sorted.map((p, idx) => ({
    rank: idx + 1,
    playerId: p.id,
    fullName: p.fullName,
    firstName: p.firstName,
    lastName: p.lastName,
    score: p.score,
    totalTime: parseFloat(p.totalTime.toFixed(3)),
    lastAnswerTime: p.lastAnswerTime,
    isCorrectLastRound: p.isCorrectLastRound
  }));
}

function getRoomState(room: ActiveRoom): GameRoomState {
  const playersList = Array.from(room.players.values());
  const currentQ = room.quiz.questions[room.currentQuestionIndex];
  const ranking = computeLeaderboard(playersList);

  const currentQAnswers = room.answers.get(room.currentQuestionIndex) || new Map();
  const distribution: { [key: number]: number } = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const record of currentQAnswers.values()) {
    if (record.selectedOptionIndex in distribution) {
      distribution[record.selectedOptionIndex]++;
    }
  }

  return {
    roomCode: room.roomCode,
    quizId: room.quiz.id,
    quizTitle: room.quiz.title,
    notebookId: room.quiz.notebookId,
    totalQuestions: room.quiz.questions.length,
    currentQuestionIndex: room.currentQuestionIndex,
    phase: room.phase,
    timePerQuestion: currentQ && (currentQ as any).timePerQuestion ? (currentQ as any).timePerQuestion : (room.quiz.timePerQuestion || 15),
    questionStartTime: room.questionStartTime,
    playersCount: playersList.length,
    answeredCount: currentQAnswers.size,
    players: playersList,
    ranking,
    distribution,
    currentQuestion: currentQ
      ? {
          index: room.currentQuestionIndex,
          text: currentQ.text,
          options: currentQ.options,
          feedback: room.phase !== 'question' ? currentQ.feedback : undefined,
          correctOptionIndex: room.phase !== 'question' ? currentQ.correctOptionIndex : undefined
        }
      : null
  };
}

io.on('connection', (socket: Socket) => {
  // 1. Admin creates a room with an approved quiz
  socket.on('admin:create_room', ({ quiz }: { quiz: Quiz }) => {
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      socket.emit('error', { message: 'El cuestionario no tiene preguntas.' });
      return;
    }

    const roomCode = generateRoomCode();
    const newRoom: ActiveRoom = {
      roomCode,
      adminSocketId: socket.id,
      quiz,
      phase: 'lobby',
      currentQuestionIndex: -1,
      questionStartTime: null,
      players: new Map(),
      answers: new Map(),
      autoTimer: null
    };

    activeRooms.set(roomCode, newRoom);
    socket.join(roomCode);
    saveActiveRoomsToDisk();
    console.log(`[Room Created] Room PIN ${roomCode} created for quiz "${quiz.title}". Persisted to disk.`);

    socket.emit('admin:room_created', {
      roomCode,
      state: getRoomState(newRoom)
    });
  });

  // 2. Student joins room (Requires Apellido and Nombre, validates exact PIN)
  socket.on('player:join_room', ({ roomCode, firstName, lastName }: { roomCode: any; firstName: string; lastName: string }) => {
    const rawPin = String(roomCode || '');
    const cleanCode = rawPin.trim().replace(/\s+/g, '').toUpperCase();
    console.log(`[Join Attempt] PIN received: "${rawPin}" -> clean: "${cleanCode}", student: "${lastName}, ${firstName}"`);

    const room = findRoomByPin(cleanCode);

    if (!room) {
      console.warn(`[Join Failed] Room PIN "${cleanCode}" not found. Active rooms:`, Array.from(activeRooms.keys()));
      socket.emit('player:join_error', { message: `El código de sala (${cleanCode || rawPin}) no existe o la partida ya finalizó.` });
      return;
    }

    const cleanFirst = String(firstName || '').trim();
    const cleanLast = String(lastName || '').trim();

    if (!cleanFirst || !cleanLast) {
      socket.emit('player:join_error', { message: 'Es obligatorio ingresar Apellido y Nombre.' });
      return;
    }

    const fullName = `${cleanLast}, ${cleanFirst}`;
    const playerId = socket.id;

    const newPlayer: Player = {
      socketId: socket.id,
      id: playerId,
      firstName: cleanFirst,
      lastName: cleanLast,
      fullName,
      connected: true,
      score: 0,
      totalTime: 0
    };

    room.players.set(socket.id, newPlayer);
    socket.join(room.roomCode);
    saveActiveRoomsToDisk();

    console.log(`[Player Joined] "${fullName}" successfully joined room ${room.roomCode}. Total players: ${room.players.size}`);

    // Confirm to player
    socket.emit('player:joined_success', {
      player: newPlayer,
      roomState: getRoomState(room)
    });

    // Notify projector/admin and everyone in room
    io.to(room.roomCode).emit('room:state_updated', getRoomState(room));
    io.to(room.roomCode).emit('room:player_joined', { player: newPlayer });
  });

  // 3. Admin starts game or advances to next question
  socket.on('admin:start_game', ({ roomCode }: { roomCode: any }) => {
    const room = findRoomByPin(roomCode);
    if (!room) return;

    room.currentQuestionIndex = 0;
    startQuestion(room);
  });

  socket.on('admin:next_question', ({ roomCode }: { roomCode: any }) => {
    const room = findRoomByPin(roomCode);
    if (!room) return;

    if (room.currentQuestionIndex + 1 < room.quiz.questions.length) {
      room.currentQuestionIndex++;
      startQuestion(room);
    } else {
      // Go to final podium
      room.phase = 'podium';
      saveActiveRoomsToDisk();
      io.to(room.roomCode).emit('room:state_updated', getRoomState(room));
    }
  });

  function startQuestion(room: ActiveRoom) {
    if (room.autoTimer) {
      clearTimeout(room.autoTimer);
      room.autoTimer = null;
    }

    room.phase = 'question';
    room.questionStartTime = Date.now();
    room.answers.set(room.currentQuestionIndex, new Map());
    saveActiveRoomsToDisk();

    const state = getRoomState(room);
    io.to(room.roomCode).emit('room:state_updated', state);

    // Schedule auto timeout for the question duration (plus 200ms grace period)
    const currentQ = room.quiz.questions[room.currentQuestionIndex];
    const questionDurationSec = (currentQ && (currentQ as any).timePerQuestion) || room.quiz.timePerQuestion || 15;
    const durationMs = questionDurationSec * 1000;
    room.autoTimer = setTimeout(() => {
      finishQuestionTimer(room);
    }, durationMs + 200);
  }

  function finishQuestionTimer(room: ActiveRoom) {
    if (room.phase !== 'question') return;
    if (room.autoTimer) {
      clearTimeout(room.autoTimer);
      room.autoTimer = null;
    }

    room.phase = 'question_result';

    // For any connected player who did not submit an answer in time:
    // They get 0 points, and their response time is recorded as the full question duration
    const qAnswers = room.answers.get(room.currentQuestionIndex) || new Map();
    const currentQ = room.quiz.questions[room.currentQuestionIndex];
    const questionDurationSec = (currentQ && (currentQ as any).timePerQuestion) || room.quiz.timePerQuestion || 15;

    for (const player of room.players.values()) {
      if (!qAnswers.has(player.id)) {
        player.totalTime += questionDurationSec;
        player.isCorrectLastRound = false;
        player.lastAnswerTime = questionDurationSec;
      }
    }

    saveActiveRoomsToDisk();
    const state = getRoomState(room);
    io.to(room.roomCode).emit('room:state_updated', state);
    io.to(room.roomCode).emit('game:question_ended', state);
  }

  // 4. Admin advances to Question Results or Ranking
  socket.on('admin:show_results', ({ roomCode }: { roomCode: any }) => {
    const room = findRoomByPin(roomCode);
    if (!room) return;
    finishQuestionTimer(room);
  });

  socket.on('admin:show_ranking', ({ roomCode }: { roomCode: any }) => {
    const room = findRoomByPin(roomCode);
    if (!room) return;
    room.phase = 'intermediate_ranking';
    saveActiveRoomsToDisk();
    io.to(room.roomCode).emit('room:state_updated', getRoomState(room));
  });

  socket.on('admin:show_podium', ({ roomCode }: { roomCode: any }) => {
    const room = findRoomByPin(roomCode);
    if (!room) return;
    room.phase = 'podium';
    saveActiveRoomsToDisk();
    io.to(room.roomCode).emit('room:state_updated', getRoomState(room));
  });

  // 5. Player submits an answer (optionIndex 0, 1, 2, or 3)
  socket.on('player:submit_answer', ({ roomCode, optionIndex }: { roomCode: any; optionIndex: number }) => {
    const room = findRoomByPin(roomCode);
    if (!room || room.phase !== 'question') return;

    const player = room.players.get(socket.id);
    if (!player) return;

    const qIndex = room.currentQuestionIndex;
    let qAnswers = room.answers.get(qIndex);
    if (!qAnswers) {
      qAnswers = new Map();
      room.answers.set(qIndex, qAnswers);
    }

    // Single-touch lock: check if player already answered this question
    if (qAnswers.has(player.id)) {
      return; // Already submitted!
    }

    // Milimetric precision response time
    const receivedTime = Date.now();
    const startTime = room.questionStartTime || receivedTime;
    const responseTimeSec = Math.max(0.01, (receivedTime - startTime) / 1000);

    const currentQ = room.quiz.questions[qIndex];
    const isCorrect = optionIndex === currentQ.correctOptionIndex;

    // Strict scoring: Exactly 1 point if correct, 0 if incorrect
    if (isCorrect) {
      player.score += 1;
    }
    player.totalTime += responseTimeSec;
    player.lastAnswerTime = responseTimeSec;
    player.isCorrectLastRound = isCorrect;

    const record: PlayerAnswerRecord = {
      playerId: player.id,
      questionIndex: qIndex,
      selectedOptionIndex: optionIndex,
      responseTimeSec: parseFloat(responseTimeSec.toFixed(3)),
      isCorrect,
      timestamp: receivedTime
    };

    qAnswers.set(player.id, record);
    saveActiveRoomsToDisk();

    // Send instant confirmation to this player
    socket.emit('player:answer_acknowledged', {
      selectedOptionIndex: optionIndex,
      responseTimeSec: record.responseTimeSec
    });

    // Broadcast updated state immediately to projector (updates live answeredCount!)
    io.to(room.roomCode).emit('room:state_updated', getRoomState(room));

    // Check if ALL active connected players have answered
    const activeConnectedPlayers = Array.from(room.players.values()).filter(p => p.connected);
    if (activeConnectedPlayers.length > 0 && qAnswers.size >= activeConnectedPlayers.length) {
      // All answered! Transition to results immediately
      setTimeout(() => {
        finishQuestionTimer(room);
      }, 350);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    for (const [code, room] of activeRooms.entries()) {
      if (room.adminSocketId === socket.id) {
        // Admin disconnected - room remains saved on disk!
      } else if (room.players.has(socket.id)) {
        const player = room.players.get(socket.id);
        if (player) {
          player.connected = false;
          saveActiveRoomsToDisk();
          io.to(code).emit('room:player_left', { playerId: socket.id, fullName: player.fullName });
          io.to(code).emit('room:state_updated', getRoomState(room));
        }
      }
    }
  });
});

// Room verification and debug endpoint
app.get('/api/rooms/:code', (req, res) => {
  const room = findRoomByPin(req.params.code);
  if (!room) {
    return res.status(404).json({
      error: 'Sala no encontrada o expirada',
      requestedCode: req.params.code,
      activeRooms: Array.from(activeRooms.keys())
    });
  }
  res.json({
    roomCode: room.roomCode,
    quizTitle: room.quiz.title,
    phase: room.phase,
    playersCount: room.players.size,
    totalQuestions: room.quiz.questions.length
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    activeRoomsCount: activeRooms.size,
    activeRooms: Array.from(activeRooms.keys())
  });
});

// Vite Middleware integration for development and optimized static serving for production
async function startServer() {
  // Load persistent notebooks from cuadernos.json in project root
  notebooks = await loadCuadernos();
  console.log(`Loaded ${notebooks.length} notebooks from cuadernos.json`);

  // Load persistent active rooms from disk
  loadActiveRoomsFromDisk();
  console.log(`Loaded ${activeRooms.size} active rooms from persistent storage:`, Array.from(activeRooms.keys()));

  const distPath = path.resolve(process.cwd(), 'dist');
  const indexHtmlPath = path.join(distPath, 'index.html');
  const hasDist = fs.existsSync(indexHtmlPath);

  if (hasDist) {
    console.log('Serving production static build from:', distPath);
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      if (fs.existsSync(indexHtmlPath)) {
        return res.sendFile(indexHtmlPath);
      }
      next();
    });
  } else {
    // If dist/index.html does not exist, use Vite dev middleware so preview never breaks with ENOENT
    console.log('dist/index.html not found, mounting Vite middleware...');
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log('Vite middleware mounted successfully');
    } catch (viteErr) {
      console.error('Could not start Vite middleware:', viteErr);
      // Fallback: create emergency dist and copy index.html
      if (!fs.existsSync(distPath)) fs.mkdirSync(distPath, { recursive: true });
      const rootHtml = path.resolve(process.cwd(), 'index.html');
      if (fs.existsSync(rootHtml) && !fs.existsSync(indexHtmlPath)) {
        fs.copyFileSync(rootHtml, indexHtmlPath);
      }
      app.use(express.static(distPath));
      app.get('*', (req, res) => res.sendFile(indexHtmlPath));
    }
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} (Mode: ${hasDist ? 'Production (Static)' : 'Development (Vite)'})`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
