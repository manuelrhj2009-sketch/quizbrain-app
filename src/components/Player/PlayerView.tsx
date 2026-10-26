import React, { useEffect, useState } from 'react';
import { getPlayerSocket } from '../../services/socket.ts';
import { GameRoomState, Player } from '../../types/index.ts';
import { PlayerLogin } from './PlayerLogin.tsx';
import { PlayerWaiting } from './PlayerWaiting.tsx';
import { PlayerController } from './PlayerController.tsx';
import { PlayerAnswered } from './PlayerAnswered.tsx';
import { PlayerRoundResult } from './PlayerRoundResult.tsx';
import { PlayerFinalScreen } from './PlayerFinalScreen.tsx';

import { Socket } from 'socket.io-client';

interface Props {
  initialRoomCode?: string;
  onExit?: () => void;
  playerSocket?: Socket;
}

export const PlayerView: React.FC<Props> = ({ initialRoomCode = '', playerSocket }) => {
  const socket = playerSocket || getPlayerSocket();

  const [player, setPlayer] = useState<Player | null>(null);
  const [roomState, setRoomState] = useState<GameRoomState | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Per-round player state
  const [hasAnsweredRound, setHasAnsweredRound] = useState<boolean>(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [roundResponseTime, setRoundResponseTime] = useState<number | undefined>(undefined);

  useEffect(() => {
    const onJoinError = ({ message }: { message: string }) => {
      setJoinError(message);
      setLoading(false);
    };

    const onJoinedSuccess = ({ player: newPlayer, roomState: state }: { player: Player; roomState: GameRoomState }) => {
      setPlayer(newPlayer);
      setRoomState(state);
      setLoading(false);
      setJoinError(null);
    };

    const onStateUpdated = (updatedState: GameRoomState) => {
      setRoomState(updatedState);

      // When room transitions into a new question, reset round answer state!
      if (updatedState.phase === 'question') {
        setHasAnsweredRound(false);
        setSelectedOptionIndex(null);
        setRoundResponseTime(undefined);
      }

      // Update current player stats from the updated room ranking/players
      setPlayer((prev) => {
        if (!prev) return prev;
        const fresh = updatedState.players.find((p) => p.id === prev.id);
        return fresh ? { ...prev, ...fresh } : prev;
      });
    };

    const onAnswerAck = ({ selectedOptionIndex: optIdx, responseTimeSec }: { selectedOptionIndex: number; responseTimeSec: number }) => {
      setHasAnsweredRound(true);
      setSelectedOptionIndex(optIdx);
      setRoundResponseTime(responseTimeSec);
    };

    const onConnectError = () => {
      setLoading(false);
      setJoinError('Conectando al servidor en tiempo real... Reintentando automáticamente.');
    };

    const onConnect = () => {
      if (joinError && joinError.startsWith('Conectando')) {
        setJoinError(null);
      }
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
    socket.on('player:join_error', onJoinError);
    socket.on('player:joined_success', onJoinedSuccess);
    socket.on('room:state_updated', onStateUpdated);
    socket.on('player:answer_acknowledged', onAnswerAck);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.off('player:join_error', onJoinError);
      socket.off('player:joined_success', onJoinedSuccess);
      socket.off('room:state_updated', onStateUpdated);
      socket.off('player:answer_acknowledged', onAnswerAck);
    };
  }, [socket, joinError]);

  const handleJoin = (roomCode: string, firstName: string, lastName: string) => {
    setLoading(true);
    setJoinError(null);
    socket.emit('player:join_room', { roomCode, firstName, lastName });
  };

  const handleAnswer = (optionIndex: number) => {
    if (!roomState || !player || hasAnsweredRound) return;
    socket.emit('player:submit_answer', {
      roomCode: roomState.roomCode,
      optionIndex
    });
  };

  // If not joined yet: show Login screen
  if (!player || !roomState) {
    return (
      <PlayerLogin
        initialRoomCode={initialRoomCode}
        onJoin={handleJoin}
        error={joinError}
        loading={loading}
      />
    );
  }

  // Phase 1: Lobby -> Player is waiting for admin to start
  if (roomState.phase === 'lobby') {
    return <PlayerWaiting player={player} roomState={roomState} />;
  }

  // Phase 2: Active Question
  if (roomState.phase === 'question') {
    // If student has already answered this question -> show locked confirmation screen
    if (hasAnsweredRound && selectedOptionIndex !== null) {
      return (
        <PlayerAnswered
          selectedOptionIndex={selectedOptionIndex}
          responseTimeSec={roundResponseTime}
        />
      );
    }

    // Otherwise -> Pure 2x2 interactive tactile screen!
    return <PlayerController onSelectOption={handleAnswer} />;
  }

  // Phase 3 & 4: Question Result or Intermediate Ranking
  if (roomState.phase === 'question_result' || roomState.phase === 'intermediate_ranking') {
    return (
      <PlayerRoundResult
        player={player}
        roomState={roomState}
        selectedOptionIndex={selectedOptionIndex}
      />
    );
  }

  // Phase 5: Final Podium
  if (roomState.phase === 'podium') {
    return (
      <PlayerFinalScreen
        player={player}
        roomState={roomState}
        onPlayAgain={() => {
          setPlayer(null);
          setRoomState(null);
        }}
      />
    );
  }

  return <PlayerWaiting player={player} roomState={roomState} />;
};
