import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';
import Background from './Background';
import Timer from './Timer';
import Card from './Card';
import { Queue } from '../lib/Queue';
import MultiplayerService, { 
  MultiplayerRoom, 
  MultiplayerPlayer, 
  MultiplayerQuestion 
} from '../services/MultiplayerService';
import '../styles/MultiplayerScreen.css';

interface MultiplayerScreenProps {
  onBack: () => void;
  playerName: string;
}

interface RoomInfo {
  roomCode: string;
  players: MultiplayerPlayer[];
  currentQuestion: MultiplayerQuestion | null;
  questionNumber: number;
  totalQuestions: number;
  isGameStarted: boolean;
  isGameFinished: boolean;
}

const TOTAL_QUESTIONS = 5;

const MultiplayerScreen: React.FC<MultiplayerScreenProps> = ({ onBack, playerName }) => {
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'lobby' | 'game' | 'results'>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [showFeedback, setShowFeedback] = useState<{show: boolean, isCorrect: boolean} | null>(null);
  const [answerQueue] = useState(() => new Queue<{ answer: number, time: number }>());
  const [playerId] = useState(() => 'player-' + Math.random().toString(36).substring(7));
  const [error, setError] = useState<string | null>(null);
  const multiplayerService = MultiplayerService.getInstance();
  const wsRef = useRef<WebSocket | null>(null);

  const generateRoomCode = (): string => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const generateQRCode = (code: string): string => {
    // Usando una API pública para generar códigos QR
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      `ROOM:${code}`
    )}`;
  };

  const connectWebSocket = (code: string, isCreating: boolean) => {
    // Simulación de WebSocket con backend local
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.hostname}:8080/ws/multiplayer/${code}`);
    
    ws.onopen = () => {
      console.log('WebSocket conectado');
      ws.send(JSON.stringify({
        type: isCreating ? 'CREATE_ROOM' : 'JOIN_ROOM',
        playerName: playerName,
        roomCode: code
      }));
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };

    ws.onerror = () => {
      console.error('Error en WebSocket, usando modo simulado');
      startSimulatedGame(code, isCreating);
    };

    wsRef.current = ws;
  };

  const startSimulatedGame = (code: string, isCreating: boolean) => {
    // Modo simulado sin WebSocket para desarrollo
    const simulatedRoom: RoomInfo = {
      roomCode: code,
      players: [
        { id: '1', username: playerName, score: 0, answeredCount: 0, averageTime: 0 },
        { id: 'bot1', username: 'ChatBot', score: 0, answeredCount: 0, averageTime: 0, isBot: true },
      ],
      currentQuestion: null,
      questionNumber: 0,
      totalQuestions: TOTAL_QUESTIONS,
      isGameStarted: false,
      isGameFinished: false
    };

    setRoomInfo(simulatedRoom);
    setView('lobby');
    
    if (isCreating) {
      setRoomCode(code);
    }
  };

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'ROOM_CREATED':
      case 'ROOM_JOINED':
        setRoomInfo(data.room);
        setView('lobby');
        break;
      case 'PLAYER_JOINED':
        setRoomInfo(data.room);
        break;
      case 'GAME_STARTED':
        setRoomInfo(data.room);
        setView('game');
        setQuestionStartTime(Date.now());
        break;
      case 'NEW_QUESTION':
        setRoomInfo(prev => prev ? { ...prev, currentQuestion: data.question, questionNumber: data.questionNumber } : null);
        setCurrentAnswer('');
        setQuestionStartTime(Date.now());
        setShowFeedback(null);
        break;
      case 'ANSWER_RESULT':
        setShowFeedback({ show: true, isCorrect: data.isCorrect });
        setTimeout(() => setShowFeedback(null), 1500);
        break;
      case 'PLAYER_ANSWERED':
        setRoomInfo(data.room);
        break;
      case 'GAME_FINISHED':
        setRoomInfo(data.room);
        setView('results');
        break;
    }
  };

  const handleCreateRoom = async () => {
    setError(null);
    const response = await multiplayerService.createRoom(playerId, playerName);
    
    if (response.success && response.room) {
      setRoomCode(response.roomCode);
      convertRoomToRoomInfo(response.room);
      setView('lobby');
    } else {
      setError(response.message || 'Error al crear la sala');
    }
  };

  const handleJoinRoom = async () => {
    if (!inputRoomCode.trim()) return;
    
    setError(null);
    const response = await multiplayerService.joinRoom(inputRoomCode.toUpperCase(), playerId, playerName);
    
    if (response.success && response.room) {
      setRoomCode(inputRoomCode.toUpperCase());
      convertRoomToRoomInfo(response.room);
      setView('lobby');
    } else {
      setError(response.message || 'Error al unirse a la sala');
    }
  };

  const convertRoomToRoomInfo = (room: MultiplayerRoom) => {
    const info: RoomInfo = {
      roomCode: room.roomCode,
      players: room.players,
      currentQuestion: room.questions && room.questions.length > room.currentQuestionIndex 
        ? room.questions[room.currentQuestionIndex] 
        : null,
      questionNumber: room.currentQuestionIndex + 1,
      totalQuestions: TOTAL_QUESTIONS,
      isGameStarted: room.status === 'PLAYING',
      isGameFinished: room.status === 'FINISHED'
    };
    setRoomInfo(info);
  };

  const handleStartGame = async () => {
    if (!roomCode) return;
    
    setError(null);
    const response = await multiplayerService.startGame(roomCode);
    
    if (response.success && response.room) {
      convertRoomToRoomInfo(response.room);
      setView('game');
      setQuestionStartTime(Date.now());
    } else {
      setError(response.message || 'Error al iniciar el juego');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!roomInfo || !roomInfo.currentQuestion || !currentAnswer.trim() || !roomCode) return;
    
    const userAnswer = parseInt(currentAnswer);
    const timeTaken = Date.now() - questionStartTime;
    const isCorrect = userAnswer === roomInfo.currentQuestion.answer;
    
    // Guardar en cola de respuestas
    answerQueue.enqueue({ answer: userAnswer, time: timeTaken });
    
    setShowFeedback({ show: true, isCorrect });
    
    // Enviar respuesta al backend
    const response = await multiplayerService.submitAnswer(roomCode, playerId, userAnswer, timeTaken);
    
    if (response.success) {
      setTimeout(() => {
        setShowFeedback(null);
        
        if (response.isFinished) {
          convertRoomToRoomInfo(response.room);
          setView('results');
        } else if (response.currentQuestion) {
          convertRoomToRoomInfo(response.room);
          setCurrentAnswer('');
          setQuestionStartTime(Date.now());
        }
      }, 1500);
    }
  };

  const getSortedPlayers = (): MultiplayerPlayer[] => {
    if (!roomInfo) return [];
    
    // Ordenar por: 1) Puntuación, 2) Tiempo promedio (menor es mejor)
    return [...roomInfo.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.averageTime || 0) - (b.averageTime || 0);
    });
  };

  const renderMenu = () => (
    <div className="multiplayer-menu">
      <Background level="advanced" />
      <motion.div
        className="menu-container"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h1 className="menu-title">Modo Multijugador</h1>
        <p className="menu-subtitle">Compite con amigos en tiempo real</p>
        
        <div className="menu-buttons">
          <Button onClick={handleCreateRoom} className="menu-button create-button">
            <span className="button-icon">🎮</span>
            <span>Crear Sala</span>
          </Button>
          
          <Button onClick={() => setView('join')} className="menu-button join-button">
            <span className="button-icon">🔗</span>
            <span>Unirse con Código</span>
          </Button>
          
          <Button onClick={onBack} className="menu-button back-button">
            <span className="button-icon">←</span>
            <span>Volver</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );

  const renderJoinRoom = () => (
    <div className="multiplayer-join">
      <Background level="advanced" />
      <motion.div
        className="join-container"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="join-title">Unirse a Sala</h2>
        <Input
          value={inputRoomCode}
          onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
          placeholder="Ingresa el código de sala"
          className="room-code-input"
        />
        <div className="join-buttons">
          <Button onClick={handleJoinRoom} className="join-submit-button">
            Unirse
          </Button>
          <Button onClick={() => setView('menu')} className="join-back-button">
            Cancelar
          </Button>
        </div>
      </motion.div>
    </div>
  );

  const renderLobby = () => (
    <div className="multiplayer-lobby">
      <Background level="advanced" />
      <motion.div
        className="lobby-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="lobby-title">Sala de Espera</h2>
        
        <div className="room-info">
          <div className="room-code-display">
            <p className="code-label">Código de Sala:</p>
            <p className="code-value">{roomInfo?.roomCode}</p>
          </div>
          
          <div className="qr-code">
            <img 
              src={generateQRCode(roomInfo?.roomCode || '')} 
              alt="QR Code" 
              className="qr-image"
            />
            <p className="qr-label">Escanea para unirte</p>
          </div>
        </div>
        
        <div className="players-list">
          <h3 className="players-title">Jugadores ({roomInfo?.players.length}/5)</h3>
          {roomInfo?.players.map((player, index) => (
            <Card key={player.id} className="player-card">
              <span className="player-icon">{player.isBot ? '🤖' : '👤'}</span>
              <span className="player-name">{player.username}</span>
              {index === 0 && <span className="host-badge">Host</span>}
            </Card>
          ))}
        </div>
        
        <div className="lobby-actions">
          <Button 
            onClick={handleStartGame} 
            className="start-game-button"
            disabled={(roomInfo?.players.length || 0) < 2}
          >
            Iniciar Juego
          </Button>
          <Button onClick={() => { setView('menu'); wsRef.current?.close(); }} className="leave-button">
            Salir
          </Button>
        </div>
      </motion.div>
    </div>
  );

  const renderGame = () => (
    <div className="multiplayer-game">
      <Background level="expert" />
      <motion.div
        className="game-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="game-header">
          <div className="question-counter">
            Pregunta {roomInfo?.questionNumber}/{TOTAL_QUESTIONS}
          </div>
          <Timer timeRemaining={30} />
        </div>
        
        <AnimatePresence mode="wait">
          {showFeedback?.show ? (
            <motion.div
              key="feedback"
              className={`feedback ${showFeedback.isCorrect ? 'correct' : 'incorrect'}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              {showFeedback.isCorrect ? '✓ ¡Correcto!' : '✗ Incorrecto'}
            </motion.div>
          ) : (
            <motion.div
              key="question"
              className="question-display"
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
            >
              <h2 className="question-text">{roomInfo?.currentQuestion?.prompt}</h2>
              <Input
                type="number"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                placeholder="Tu respuesta"
                className="answer-input"
              />
              <Button onClick={handleSubmitAnswer} className="submit-answer-button">
                Enviar Respuesta
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="live-scoreboard">
          <h3 className="scoreboard-title">Marcador en Vivo</h3>
          {roomInfo?.players.map((player, index) => (
            <div key={player.id} className={`score-item ${player.username === playerName ? 'current-player' : ''}`}>
              <span className="rank">#{index + 1}</span>
              <span className="player-info">
                {player.isBot ? '🤖' : '👤'} {player.username}
              </span>
              <span className="score">{player.score} pts</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );

  const renderResults = () => {
    const sortedPlayers = getSortedPlayers();
    const podium = sortedPlayers.slice(0, 5);
    
    return (
      <div className="multiplayer-results">
        <Background level="basic" />
        <motion.div
          className="results-container"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h1 className="results-title">🏆 Podio Final 🏆</h1>
          
          <div className="podium-container">
            {podium.map((player, index) => (
              <motion.div
                key={player.id}
                className={`podium-card rank-${index + 1} ${player.username === playerName ? 'current-player' : ''}`}
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="medal">
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </div>
                <div className="player-avatar">
                  {player.isBot ? '🤖' : '👤'}
                </div>
                <h3 className="player-name-result">{player.username}</h3>
                <div className="player-stats">
                  <div className="stat">
                    <span className="stat-label">Puntuación</span>
                    <span className="stat-value">{player.score}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Tiempo Promedio</span>
                    <span className="stat-value">{((player.averageTime || 0) / 1000).toFixed(2)}s</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">Respuestas</span>
                    <span className="stat-value">{player.answeredCount}/{TOTAL_QUESTIONS}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="results-actions">
            <Button onClick={() => setView('menu')} className="play-again-button">
              Jugar de Nuevo
            </Button>
            <Button onClick={onBack} className="back-home-button">
              Volver al Menú Principal
            </Button>
          </div>
        </motion.div>
      </div>
    );
  };

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return (
    <>
      {view === 'menu' && renderMenu()}
      {view === 'join' && renderJoinRoom()}
      {view === 'lobby' && renderLobby()}
      {view === 'game' && renderGame()}
      {view === 'results' && renderResults()}
    </>
  );
};

export default MultiplayerScreen;
