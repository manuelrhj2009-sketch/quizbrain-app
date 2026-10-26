import React, { useEffect, useState, useRef, useCallback } from 'react';
import { getSocket } from '../../services/socket.ts';
import { Quiz, GameRoomState } from '../../types/index.ts';
import { ProjectorLobby } from './ProjectorLobby.tsx';
import { ProjectorQuestion } from './ProjectorQuestion.tsx';
import { ProjectorResult } from './ProjectorResult.tsx';
import { ProjectorRanking } from './ProjectorRanking.tsx';
import { ProjectorPodium } from './ProjectorPodium.tsx';
import { SoundEffects } from '../../services/sound.ts';
import { Volume2, VolumeX, LogOut, FastForward, Play, Layers } from 'lucide-react';

interface Props {
  quiz: Quiz;
  onExit: () => void;
}

export const ProjectorView: React.FC<Props> = ({ quiz, onExit }) => {
  const socket = getSocket();
  const [roomState, setRoomState] = useState<GameRoomState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const roomCreatedRef = useRef<boolean>(false);

  useEffect(() => {
    if (roomCreatedRef.current) return;
    roomCreatedRef.current = true;

    const emitCreateRoom = () => {
      socket.emit('admin:create_room', { quiz });
    };

    if (socket.connected) {
      emitCreateRoom();
    } else {
      socket.once('connect', emitCreateRoom);
    }

    const onRoomCreated = ({ state }: { roomCode: string; state: GameRoomState }) => {
      setRoomState(state);
      setLoading(false);
    };

    const onStateUpdated = (updatedState: GameRoomState) => {
      setRoomState(updatedState);
    };

    socket.on('admin:room_created', onRoomCreated);
    socket.on('room:state_updated', onStateUpdated);

    return () => {
      socket.off('admin:room_created', onRoomCreated);
      socket.off('room:state_updated', onStateUpdated);
    };
  }, [quiz, socket]);

  const handleToggleSound = () => {
    const newState = SoundEffects.toggleSound();
    setSoundEnabled(newState);
  };

  const handleStartGame = useCallback(() => {
    if (!roomState) return;
    socket.emit('admin:start_game', { roomCode: roomState.roomCode });
  }, [roomState, socket]);

  const handleSkipQuestion = useCallback(() => {
    if (!roomState) return;
    socket.emit('admin:show_results', { roomCode: roomState.roomCode });
  }, [roomState, socket]);

  const handleShowRanking = useCallback(() => {
    if (!roomState) return;
    socket.emit('admin:show_ranking', { roomCode: roomState.roomCode });
  }, [roomState, socket]);

  const handleNextQuestion = useCallback(() => {
    if (!roomState) return;
    socket.emit('admin:next_question', { roomCode: roomState.roomCode });
  }, [roomState, socket]);

  const handleShowPodium = useCallback(() => {
    if (!roomState) return;
    socket.emit('admin:show_podium', { roomCode: roomState.roomCode });
  }, [roomState, socket]);

  // Master advance step based on current phase
  const handleMasterAdvance = useCallback(() => {
    if (!roomState) return;
    if (roomState.phase === 'lobby') {
      handleStartGame();
    } else if (roomState.phase === 'question') {
      handleSkipQuestion();
    } else if (roomState.phase === 'question_result') {
      handleShowRanking();
    } else if (roomState.phase === 'intermediate_ranking') {
      const isLast = roomState.currentQuestionIndex + 1 >= roomState.totalQuestions;
      if (isLast) {
        handleShowPodium();
      } else {
        handleNextQuestion();
      }
    }
  }, [roomState, handleStartGame, handleSkipQuestion, handleShowRanking, handleNextQuestion, handleShowPodium]);

  if (loading || !roomState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-3">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Iniciando sala en el proyector...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-slate-950">
      {/* Active Phase Screens */}
      {roomState.phase === 'lobby' && (
        <ProjectorLobby
          roomState={roomState}
          onStartGame={handleStartGame}
          onExit={onExit}
          soundEnabled={soundEnabled}
          onToggleSound={handleToggleSound}
        />
      )}

      {roomState.phase === 'question' && (
        <ProjectorQuestion
          roomState={roomState}
          onSkipQuestion={handleSkipQuestion}
        />
      )}

      {roomState.phase === 'question_result' && (
        <ProjectorResult
          roomState={roomState}
          onNext={handleShowRanking}
        />
      )}

      {roomState.phase === 'intermediate_ranking' && (
        <ProjectorRanking
          roomState={roomState}
          onNextQuestion={handleNextQuestion}
          onShowPodium={handleShowPodium}
        />
      )}

      {roomState.phase === 'podium' && (
        <ProjectorPodium
          roomState={roomState}
          onExit={onExit}
        />
      )}

      {/* Floating Presenter Quick Bar (Always available in the corner for the teacher) */}
      <div className="fixed bottom-3 left-3 z-50 flex items-center gap-1.5 p-1.5 bg-slate-900/90 hover:bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md text-xs text-slate-300 transition-all opacity-85 hover:opacity-100">
        <div className="px-2.5 py-1 bg-slate-950 rounded-xl font-mono text-[11px] font-bold text-slate-400 flex items-center gap-1">
          <Layers className="w-3 h-3 text-indigo-400" />
          <span>PIN: {roomState.roomCode}</span>
        </div>

        {roomState.phase !== 'podium' && (
          <button
            onClick={handleMasterAdvance}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1 shadow transition cursor-pointer active:scale-95"
            title="Avanzar a la siguiente pantalla (Tecla Espacio o Enter)"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span>Avanzar</span>
          </button>
        )}

        <button
          onClick={handleToggleSound}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          title={soundEnabled ? 'Silenciar efectos' : 'Activar sonido'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
        </button>

        <button
          onClick={onExit}
          className="p-1.5 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl transition cursor-pointer"
          title="Salir al panel de administración"
        >
          <LogOut className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
