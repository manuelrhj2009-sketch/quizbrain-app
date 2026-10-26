import { Notebook, Quiz, DocumentSource, GameSessionHistory } from '../types/index.ts';

export const api = {
  getNotebooks: async (): Promise<Notebook[]> => {
    const res = await fetch('/api/notebooks');
    if (!res.ok) throw new Error('Error al cargar cuadernos');
    return res.json();
  },

  createNotebook: async (title: string, description: string): Promise<Notebook> => {
    const res = await fetch('/api/notebooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al crear cuaderno');
    }
    return res.json();
  },

  getNotebook: async (id: string): Promise<Notebook> => {
    const res = await fetch(`/api/notebooks/${id}`);
    if (!res.ok) throw new Error('Cuaderno no encontrado');
    return res.json();
  },

  deleteNotebook: async (id: string): Promise<void> => {
    const res = await fetch(`/api/notebooks/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Error al eliminar cuaderno');
  },

  uploadFileSource: async (notebookId: string, file: File): Promise<DocumentSource> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/notebooks/${notebookId}/sources`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al subir documento');
    }
    return res.json();
  },

  addTextSource: async (notebookId: string, name: string, content: string): Promise<DocumentSource> => {
    const res = await fetch(`/api/notebooks/${notebookId}/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, content })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar texto');
    }
    return res.json();
  },

  addNotebookLmSource: async (
    notebookId: string,
    data: { name: string; content: string; notebookLmUrl?: string }
  ): Promise<DocumentSource> => {
    const res = await fetch(`/api/notebooks/${notebookId}/notebooklm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al conectar con NotebookLM');
    }
    return res.json();
  },

  deleteSource: async (notebookId: string, sourceId: string): Promise<void> => {
    const res = await fetch(`/api/notebooks/${notebookId}/sources/${sourceId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar fuente');
  },

  generateQuizWithAI: async (
    notebookId: string,
    params: {
      numQuestions: number;
      timePerQuestion: number;
      complexity: 'Fácil' | 'Medio' | 'Difícil';
      customTopic?: string;
      usePromptOnly?: boolean;
    }
  ): Promise<Quiz> => {
    const res = await fetch(`/api/notebooks/${notebookId}/generate-quiz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.details || err.error || 'Error al generar preguntas con IA');
    }
    return res.json();
  },

  saveQuiz: async (notebookId: string, quiz: Quiz): Promise<Quiz> => {
    const res = await fetch(`/api/notebooks/${notebookId}/quizzes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quiz)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Error al guardar cuestionario');
    }
    return res.json();
  },

  deleteQuiz: async (notebookId: string, quizId: string): Promise<void> => {
    const res = await fetch(`/api/notebooks/${notebookId}/quizzes/${quizId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Error al eliminar cuestionario');
  },

  saveHistory: async (notebookId: string, session: GameSessionHistory): Promise<void> => {
    const res = await fetch(`/api/notebooks/${notebookId}/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session)
    });
    if (!res.ok) throw new Error('Error al guardar historial');
  }
};
