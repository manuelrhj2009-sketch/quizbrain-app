/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { Notebook, Quiz } from './types/index.ts';
import { api } from './services/api.ts';
import { createPlayerSocket } from './services/socket.ts';
import { AdminNavbar } from './components/Admin/AdminNavbar.tsx';
import { AdminDashboard } from './components/Admin/AdminDashboard.tsx';
import { NotebookDetail } from './components/Admin/NotebookDetail.tsx';
import { ProjectorView } from './components/Projector/ProjectorView.tsx';
import { PlayerView } from './components/Player/PlayerView.tsx';
import { Smartphone, X } from 'lucide-react';

export default function App() {
  const [role, setRole] = useState<'admin' | 'projector' | 'player'>('admin');
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');
  const [showMobileSimulator, setShowMobileSimulator] = useState<boolean>(false);
  const simulatorSocketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (showMobileSimulator) {
      if (!simulatorSocketRef.current) {
        simulatorSocketRef.current = createPlayerSocket();
      }
    } else {
      if (simulatorSocketRef.current) {
        simulatorSocketRef.current.disconnect();
        simulatorSocketRef.current = null;
      }
    }
  }, [showMobileSimulator]);

  // Initialize query parameters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pinParam = params.get('pin') || params.get('room');
      const roleParam = params.get('role');

      if (pinParam) {
        setUrlRoomCode(pinParam);
      }

      if (roleParam === 'player' || pinParam) {
        setRole('player');
      }
    }
  }, []);

  // Load Notebooks
  const fetchNotebooks = async (targetId?: string) => {
    try {
      const data = await api.getNotebooks();
      setNotebooks(data);
      setSelectedNotebook((prev) => {
        const idToFind = targetId || prev?.id;
        if (!idToFind) return null;
        return data.find((n) => n.id === idToFind) || null;
      });
    } catch (err) {
      console.error('Error fetching notebooks:', err);
    }
  };

  useEffect(() => {
    fetchNotebooks();
  }, []);

  // Handle direct launch of projector via URL parameters (e.g. from public URL redirect)
  useEffect(() => {
    if (typeof window !== 'undefined' && notebooks.length > 0 && !activeQuiz) {
      const params = new URLSearchParams(window.location.search);
      const roleParam = params.get('role');
      const quizIdParam = params.get('quizId');
      if (roleParam === 'projector' && quizIdParam) {
        for (const nb of notebooks) {
          const match = nb.quizzes?.find((q) => q.id === quizIdParam);
          if (match) {
            setActiveQuiz(match);
            setRole('projector');
            break;
          }
        }
      }
    }
  }, [notebooks, activeQuiz]);

  const handleLaunchQuiz = (quiz: Quiz) => {
    setActiveQuiz(quiz);
    setRole('projector');
  };

  const handleExitProjector = () => {
    setActiveQuiz(null);
    setRole('admin');
    fetchNotebooks();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Show Navbar when not in full-screen Projector mode */}
      {role !== 'projector' && (
        <AdminNavbar
          currentRole={role}
          onChangeRole={(newRole) => setRole(newRole)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1">
        {role === 'admin' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
            {selectedNotebook ? (
              <NotebookDetail
                notebook={selectedNotebook}
                onBack={() => setSelectedNotebook(null)}
                onLaunchQuiz={handleLaunchQuiz}
                onRefreshNotebook={fetchNotebooks}
              />
            ) : (
              <AdminDashboard
                notebooks={notebooks}
                onSelectNotebook={(nb) => setSelectedNotebook(nb)}
                onRefresh={fetchNotebooks}
                onLaunchQuiz={handleLaunchQuiz}
              />
            )}
          </div>
        )}

        {role === 'projector' && activeQuiz && (
          <div className="relative">
            <ProjectorView
              quiz={activeQuiz}
              onExit={handleExitProjector}
            />

            {/* Quick Mobile Test Simulator floating trigger for Projector screen */}
            <button
              onClick={() => setShowMobileSimulator(!showMobileSimulator)}
              className="fixed bottom-4 right-4 z-50 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-2xl shadow-2xl border border-indigo-400/40 flex items-center gap-2 backdrop-blur-md transition transform active:scale-95"
            >
              <Smartphone className="w-4 h-4" />
              <span>{showMobileSimulator ? 'Cerrar Teléfono Simulado' : '📱 Simular Celular de Alumno'}</span>
            </button>

            {/* Floating Smartphone Simulator Drawer */}
            {showMobileSimulator && (
              <div className="fixed bottom-16 right-4 z-50 w-[340px] h-[640px] bg-slate-950 border-4 border-slate-700 rounded-[40px] shadow-[0_10px_50px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
                <div className="bg-slate-900 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-[11px] font-bold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                    Simulador Móvil (Estudiante)
                  </span>
                  <button
                    onClick={() => setShowMobileSimulator(false)}
                    className="p-1 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden relative">
                  <PlayerView playerSocket={simulatorSocketRef.current || undefined} />
                </div>
              </div>
            )}
          </div>
        )}

        {role === 'player' && (
          <div className="w-full min-h-screen">
            <PlayerView initialRoomCode={urlRoomCode} />
          </div>
        )}
      </main>
    </div>
  );
}
