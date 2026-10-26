export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

export interface QuizOption {
  id: string; // '0' | '1' | '2' | '3'
  text: string;
  suit: Suit;
  color: 'red' | 'blue' | 'yellow' | 'green';
  symbol: string; // '♥' | '♦' | '♣' | '♠'
  colorName: string; // 'Rojo' | 'Azul' | 'Amarillo' | 'Verde'
}

export interface Question {
  id: string;
  text: string;
  options: [QuizOption, QuizOption, QuizOption, QuizOption];
  correctOptionIndex: number; // 0, 1, 2, or 3
  feedback: string; // Retroalimentación didáctica basada en las fuentes
  explanation?: string;
  sourceReference?: string;
  timePerQuestion?: number; // Duración manual de esta pregunta (en segundos)
}

export interface Quiz {
  id: string;
  notebookId: string;
  title: string;
  description?: string;
  timePerQuestion: number; // Duración por defecto (10 a 30 seg, o manual libre)
  complexity: 'Fácil' | 'Medio' | 'Difícil';
  questions: Question[];
  approved: boolean;
  createdAt: number;
}

export interface DocumentSource {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'pptx' | 'xlsx' | 'txt' | 'note' | 'notebooklm';
  sizeBytes: number;
  content: string;
  charCount: number;
  uploadedAt: number;
  notebookLmUrl?: string;
}

export interface Notebook {
  id: string;
  title: string;
  description: string;
  sources: DocumentSource[];
  quizzes: Quiz[];
  history: GameSessionHistory[];
  createdAt: number;
}

export interface Player {
  socketId: string;
  id: string;
  firstName: string; // Nombre
  lastName: string; // Apellido
  fullName: string; // Apellido y Nombre
  connected: boolean;
  score: number; // Puntos Obtenidos (1 punto por acierto)
  totalTime: number; // Tiempo Acumulado en segundos (con precisión de ms)
  lastAnswerTime?: number;
  isCorrectLastRound?: boolean;
}

export interface PlayerAnswerRecord {
  playerId: string;
  questionIndex: number;
  selectedOptionIndex: number;
  responseTimeSec: number;
  isCorrect: boolean;
  timestamp: number;
}

export type GamePhase = 
  | 'lobby'
  | 'question'
  | 'question_result'
  | 'intermediate_ranking'
  | 'podium';

export interface GameRoomState {
  roomCode: string;
  quizId: string;
  quizTitle: string;
  notebookId: string;
  totalQuestions: number;
  currentQuestionIndex: number;
  phase: GamePhase;
  timePerQuestion: number;
  questionStartTime: number | null;
  currentQuestion: {
    index: number;
    text: string;
    options: QuizOption[];
    feedback?: string;
    correctOptionIndex?: number; // only revealed during question_result
  } | null;
  playersCount: number;
  answeredCount: number;
  players: Player[];
  ranking: LeaderboardEntry[];
  distribution?: { [optionIndex: number]: number };
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  fullName: string;
  firstName: string;
  lastName: string;
  score: number; // Puntos Obtenidos (respuestas correctas)
  totalTime: number; // Tiempo Total Acumulado en segundos
  lastAnswerTime?: number;
  isCorrectLastRound?: boolean;
  assignedGrade?: number; // Segundo puntaje para efectos de calificación (ej. 20.00, 16.50)
  gradeScaleMax?: number; // Escala máxima usada (ej. 20)
}

export interface GameSessionHistory {
  id: string;
  quizId: string;
  quizTitle: string;
  playedAt: number;
  totalPlayers: number;
  totalQuestions: number;
  ranking: LeaderboardEntry[];
  maxConfiguredScore?: number; // Puntaje máximo establecido (ej. 20)
  scoreFormula?: 'proportional_leader' | 'proportional_total' | 'rank_step';
}

export const SUIT_DEFINITIONS: Record<number, { suit: Suit; color: 'red' | 'blue' | 'yellow' | 'green'; symbol: string; colorName: string; bgClass: string; textClass: string; borderClass: string; darkBgClass: string }> = {
  0: {
    suit: 'hearts',
    color: 'red',
    symbol: '♥',
    colorName: 'Rojo',
    bgClass: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800',
    textClass: 'text-rose-600',
    borderClass: 'border-rose-500',
    darkBgClass: 'bg-rose-900/40 text-rose-300 border-rose-700'
  },
  1: {
    suit: 'diamonds',
    color: 'blue',
    symbol: '♦',
    colorName: 'Azul',
    bgClass: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800',
    textClass: 'text-blue-600',
    borderClass: 'border-blue-500',
    darkBgClass: 'bg-blue-900/40 text-blue-300 border-blue-700'
  },
  2: {
    suit: 'clubs',
    color: 'yellow',
    symbol: '♣',
    colorName: 'Amarillo',
    bgClass: 'bg-amber-500 hover:bg-amber-600 active:bg-amber-700',
    textClass: 'text-amber-500',
    borderClass: 'border-amber-400',
    darkBgClass: 'bg-amber-900/40 text-amber-300 border-amber-700'
  },
  3: {
    suit: 'spades',
    color: 'green',
    symbol: '♠',
    colorName: 'Verde',
    bgClass: 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800',
    textClass: 'text-emerald-600',
    borderClass: 'border-emerald-500',
    darkBgClass: 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
  }
};
