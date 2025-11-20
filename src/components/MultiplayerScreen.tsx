import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';
import Input from './Input';
import Background from './Background';
import Timer from './Timer';
import Card from './Card';
import MultiplayerService, {
  MultiplayerRoom,
  MultiplayerPlayer,
  MultiplayerQuestion
} from '../services/MultiplayerService';
import AITournamentService, {
  AIRoomBlueprint,
  AIChatMessage
} from '../services/AITournamentService';
import '../styles/MultiplayerScreen.css';

interface MultiplayerScreenProps {
  onBack: () => void;
  playerName: string;
  initialRoomCode?: string | null;
  onRoomCodeConsumed?: () => void;
}

interface RoomInfo {
  roomCode: string;
  players: MultiplayerPlayer[];
  currentQuestion: MultiplayerQuestion | null;
  questionNumber: number;
  totalQuestions: number;
  isGameStarted: boolean;
  isGameFinished: boolean;
  maxPlayers: number;
  roundDuration: number;
  questionTimeLimit: number;
  aiHostName?: string;
  questions?: MultiplayerQuestion[];
}

type ViewState = 'menu' | 'join' | 'lobby' | 'game' | 'results';

const TOTAL_QUESTIONS = 15;
const MAX_PLAYERS = 30;
const QUESTION_TIME_LIMIT = 25;

const MultiplayerScreen: React.FC<MultiplayerScreenProps> = ({
  onBack,
  playerName,
  initialRoomCode,
  onRoomCodeConsumed
}) => {
  const [view, setView] = useState<ViewState>('menu');
  const [roomCode, setRoomCode] = useState('');
  const [inputRoomCode, setInputRoomCode] = useState('');
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [roundTimeLeft, setRoundTimeLeft] = useState(TOTAL_QUESTIONS * QUESTION_TIME_LIMIT);
  const [showFeedback, setShowFeedback] = useState<{ show: boolean; isCorrect: boolean; message?: string } | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [playerId] = useState(() => 'player-' + Math.random().toString(36).substring(7));
  const [error, setError] = useState<string | null>(null);
  const [aiBlueprint, setAiBlueprint] = useState<AIRoomBlueprint | null>(null);
  const [aiStatus, setAiStatus] = useState('');
  const [chatMessages, setChatMessages] = useState<AIChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatSending, setIsChatSending] = useState(false);
  const [autoJoinCode, setAutoJoinCode] = useState<string | null>(initialRoomCode ? initialRoomCode.toUpperCase() : null);
  const [isAutoJoining, setIsAutoJoining] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const multiplayerService = MultiplayerService.getInstance();
  const aiOrchestrator = useMemo(() => AITournamentService.getInstance(), []);

  const sanitizeAnswer = useCallback(
    (value: string) => aiOrchestrator.sanitizeNumericAnswer(value),
    [aiOrchestrator]
  );

  const buildJoinLink = useCallback(
    (code: string) => (code ? aiOrchestrator.buildJoinUrl(code) : ''),
    [aiOrchestrator]
  );

  const updateBlueprintForRoom = useCallback(
    (code: string) => {
      const blueprint = aiOrchestrator.getBlueprint(code, playerName, TOTAL_QUESTIONS);
      setAiBlueprint(blueprint);
      setAiStatus(blueprint.roomGoal);
      setRoundTimeLeft(blueprint.roundDurationSeconds);
      return blueprint;
    },
    [aiOrchestrator, playerName]
  );

  const hydrateRoomInfo = useCallback(
    (room: MultiplayerRoom, blueprintOverride?: AIRoomBlueprint | null): RoomInfo => {
      const blueprint = blueprintOverride || aiBlueprint;
      const questionsFromRoom = room.questions && room.questions.length ? room.questions : blueprint?.questions;
      const totalQuestions = Math.min(
        blueprint?.questions.length || questionsFromRoom?.length || TOTAL_QUESTIONS,
        TOTAL_QUESTIONS
      );
      const safeIndex = Math.max(0, Math.min(room.currentQuestionIndex, totalQuestions - 1));
      const currentQuestion = questionsFromRoom?.[safeIndex] || null;

      return {
        roomCode: room.roomCode,
        players: room.players,
        currentQuestion,
        questionNumber: safeIndex + 1,
        totalQuestions,
        isGameStarted: room.status === 'PLAYING',
        isGameFinished: room.status === 'FINISHED',
        maxPlayers: room.maxPlayers || blueprint?.maxPlayers || MAX_PLAYERS,
        roundDuration: room.metadata?.roundDuration || blueprint?.roundDurationSeconds || TOTAL_QUESTIONS * QUESTION_TIME_LIMIT,
        questionTimeLimit: room.metadata?.questionTimeLimit || blueprint?.questionTimeLimitSeconds || QUESTION_TIME_LIMIT,
        aiHostName: room.metadata?.aiHostAlias || blueprint?.hostAlias,
        questions: questionsFromRoom
      };
    },
    [aiBlueprint]
  );

  const pushAiWelcomeMessage = useCallback((blueprint: AIRoomBlueprint, mode: 'reset' | 'append' = 'reset') => {
    const welcome: AIChatMessage = {
      id: `ai-welcome-${Date.now()}`,
      sender: 'ai',
      text: `Soy ${blueprint.hostAlias}. Configuré ${blueprint.questions.length} preguntas fáciles y la sala admite hasta ${blueprint.maxPlayers} jugadores sincronizados.`,
      timestamp: Date.now()
    };
    setChatMessages((prev) => (mode === 'reset' ? [welcome] : [...prev, welcome]));
  }, []);

  const handleCreateRoom = useCallback(async () => {
    setError(null);
    const response = await multiplayerService.createRoom(playerId, playerName);

    if (response.success && response.room) {
      setRoomCode(response.roomCode);
      const blueprint = updateBlueprintForRoom(response.roomCode);
      setRoomInfo(hydrateRoomInfo(response.room, blueprint));
      pushAiWelcomeMessage(blueprint, 'reset');
      setView('lobby');
    } else {
      setError(response.message || 'Error al crear la sala');
    }
  }, [hydrateRoomInfo, multiplayerService, playerId, playerName, pushAiWelcomeMessage, updateBlueprintForRoom]);

  const handleJoinRoom = useCallback(
    async (codeOverride?: string, auto = false) => {
      const targetCode = (codeOverride || inputRoomCode).trim().toUpperCase();
      if (!targetCode) return;

      setError(null);
      if (auto) {
        setIsAutoJoining(true);
      }

      const response = await multiplayerService.joinRoom(targetCode, playerId, playerName);

      if (response.success && response.room) {
        setRoomCode(targetCode);
        const blueprint = updateBlueprintForRoom(targetCode);
        setRoomInfo(hydrateRoomInfo(response.room, blueprint));
        pushAiWelcomeMessage(blueprint, auto ? 'append' : 'reset');
        setView('lobby');
        setAutoJoinCode(null);
      } else {
        setError(response.message || 'Error al unirse a la sala');
      }

      if (auto) {
        setIsAutoJoining(false);
      }
    },
    [hydrateRoomInfo, inputRoomCode, multiplayerService, playerId, playerName, pushAiWelcomeMessage, updateBlueprintForRoom]
  );

  const handleStartGame = useCallback(async () => {
    if (!roomCode) return;
    setError(null);

    const response = await multiplayerService.startGame(roomCode);

    if (response.success && response.room) {
      const hydrated = hydrateRoomInfo(response.room);
      setRoomInfo(hydrated);
      setView('game');
      setQuestionStartTime(Date.now());
      setQuestionTimeLeft(hydrated.questionTimeLimit);
      setRoundTimeLeft(hydrated.roundDuration);
      setIsAnswerLocked(false);
      setShowFeedback(null);
    } else {
      setError(response.message || 'Error al iniciar el juego');
    }
  }, [hydrateRoomInfo, multiplayerService, roomCode]);

  const handleSubmitAnswer = useCallback(async () => {
    if (isAnswerLocked || !roomInfo || !roomInfo.currentQuestion || !roomCode) {
      return;
    }

    const sanitized = sanitizeAnswer(currentAnswer);
    setCurrentAnswer(sanitized);

    if (!sanitized) {
      return;
    }

    const userAnswer = parseInt(sanitized, 10);
    const timeTaken = Date.now() - questionStartTime;
    const isCorrect = userAnswer === roomInfo.currentQuestion.answer;

    setShowFeedback({
      show: true,
      isCorrect,
      message: isCorrect ? '✓ ¡Correcto!' : '✗ Incorrecto'
    });
    setIsAnswerLocked(true);

    const response = await multiplayerService.submitAnswer(roomCode, playerId, userAnswer, timeTaken);

    if (response.success && response.room) {
      const hydrated = hydrateRoomInfo(response.room);
      setTimeout(() => {
        setRoomInfo(hydrated);
        setCurrentAnswer('');
        setQuestionStartTime(Date.now());
        setQuestionTimeLeft(hydrated.questionTimeLimit);
        setIsAnswerLocked(false);
        setShowFeedback(null);

        if (response.isFinished || hydrated.isGameFinished) {
          setView('results');
        }
      }, 900);
    } else {
      setError(response.message || 'No pudimos registrar la respuesta');
      setIsAnswerLocked(false);
    }
  }, [currentAnswer, hydrateRoomInfo, isAnswerLocked, multiplayerService, playerId, questionStartTime, roomCode, roomInfo, sanitizeAnswer]);

  const handleSendChatMessage = useCallback(async () => {
    if (!roomInfo) return;
    const trimmed = chatInput.trim();
    if (!trimmed) return;

    const playerMessage: AIChatMessage = {
      id: `player-${Date.now()}`,
      sender: 'player',
      text: trimmed,
      timestamp: Date.now()
    };

    setChatMessages((prev) => [...prev, playerMessage]);
    setChatInput('');
    setIsChatSending(true);

    const aiReply = await aiOrchestrator.getAssistantReply(trimmed, {
      roomCode: roomInfo.roomCode,
      playerName,
      question: roomInfo.currentQuestion,
      timeLeft: questionTimeLeft,
      totalQuestions: roomInfo.totalQuestions
    });

    setChatMessages((prev) => [...prev, aiReply]);
    setIsChatSending(false);
  }, [aiOrchestrator, chatInput, playerName, questionTimeLeft, roomInfo]);

  const handleCopyLink = useCallback(async () => {
    if (!roomInfo?.roomCode) return;
    const link = buildJoinLink(roomInfo.roomCode);
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard API no disponible');
      }
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 3000);
    } catch (copyError) {
      console.warn('No se pudo copiar automáticamente el enlace', copyError);
    }
  }, [buildJoinLink, roomInfo]);

  const getSortedPlayers = useCallback((): MultiplayerPlayer[] => {
    if (!roomInfo) return [];
    return [...roomInfo.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.averageTime || 0) - (b.averageTime || 0);
    });
  }, [roomInfo]);

  useEffect(() => {
    if (initialRoomCode) {
      const normalized = initialRoomCode.toUpperCase();
      setInputRoomCode(normalized);
      setAutoJoinCode(normalized);
      setView('join');
      onRoomCodeConsumed?.();
    }
  }, [initialRoomCode, onRoomCodeConsumed]);

  useEffect(() => {
    if (autoJoinCode && view === 'join' && !isAutoJoining) {
      handleJoinRoom(autoJoinCode, true);
    }
  }, [autoJoinCode, view, isAutoJoining, handleJoinRoom]);

  useEffect(() => {
    if (view !== 'game' || !roomInfo?.isGameStarted) {
      return undefined;
    }

    setIsAnswerLocked(false);
    setQuestionTimeLeft(roomInfo.questionTimeLimit);
    setQuestionStartTime(Date.now());

    const interval = window.setInterval(() => {
      setQuestionTimeLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          setIsAnswerLocked(true);
          setShowFeedback({ show: true, isCorrect: false, message: 'Tiempo agotado ⏳' });
          setTimeout(() => setShowFeedback(null), 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [roomInfo?.currentQuestion?.id, roomInfo?.isGameStarted, roomInfo?.questionNumber, roomInfo?.questionTimeLimit, view]);

  useEffect(() => {
    if (view !== 'game' || !roomInfo?.isGameStarted) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setRoundTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [roomInfo?.isGameStarted, view]);

  const progressPercentage = roomInfo
    ? Math.min(100, (roomInfo.questionNumber / roomInfo.totalQuestions) * 100)
    : 0;

  const ErrorBanner = () =>
    error ? <div className="error-banner">⚠️ {error}</div> : null;

  const renderAssistantChat = () => (
    <div className="ai-chat-panel">
      <div className="ai-chat-header">
        <span>🤖 {roomInfo?.aiHostName || aiBlueprint?.hostAlias || 'AI Coach'}</span>
        <small>{aiStatus}</small>
      </div>
      <div className="ai-chat-messages">
        {chatMessages.map((message) => (
          <div key={message.id} className={`chat-message ${message.sender}`}>
            <span className="chat-text">{message.text}</span>
            <span className="chat-time">
              {new Date(message.timestamp).toLocaleTimeString('es-ES', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        ))}
        {isChatSending && <div className="chat-typing">La IA está escribiendo…</div>}
      </div>
      <div className="ai-chat-input">
        <Input
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          placeholder="Pídele una pista a la IA"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendChatMessage();
          }}
        />
        <Button onClick={handleSendChatMessage} disabled={isChatSending || !chatInput.trim()}>
          Enviar
        </Button>
      </div>
    </div>
  );

  const renderMenu = () => (
    <div className="multiplayer-menu">
      <Background level="advanced" />
      <motion.div className="menu-container" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
        <h1 className="menu-title">Modo Multijugador</h1>
        <p className="menu-subtitle">Salas sincronizadas por IA con preguntas fáciles y tiempo limitado.</p>
        <ErrorBanner />
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
      <motion.div className="join-container" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}>
        <h2 className="join-title">Unirse a Sala</h2>
        <ErrorBanner />
        {isAutoJoining && <p className="auto-join-message">Conectando automáticamente con la sala…</p>}
        <Input
          value={inputRoomCode}
          onChange={(e) => setInputRoomCode(e.target.value.toUpperCase())}
          placeholder="Ingresa el código de sala"
          className="room-code-input"
        />
        <div className="join-buttons">
          <Button onClick={() => handleJoinRoom()} className="join-submit-button">
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
      <motion.div className="lobby-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="lobby-title">Sala sincronizada</h2>
        <ErrorBanner />
        <div className="ai-host-banner">
          <p>
            <strong>{roomInfo?.aiHostName}</strong> ya configuró {roomInfo?.totalQuestions || TOTAL_QUESTIONS} preguntas. Capacidad:
            {' '}
            {roomInfo?.maxPlayers || MAX_PLAYERS} jugadores.
          </p>
          <span>{aiStatus}</span>
        </div>
        <div className="room-info">
          <div className="room-code-display">
            <p className="code-label">Código de Sala:</p>
            <p className="code-value">{roomInfo?.roomCode}</p>
            <div className="qr-link">
              {roomInfo?.roomCode && (
                <a href={buildJoinLink(roomInfo.roomCode)} target="_blank" rel="noreferrer">
                  Abrir enlace directo
                </a>
              )}
              <button type="button" onClick={handleCopyLink}>
                Copiar
              </button>
              {linkCopied && <span className="copied-hint">¡Copiado!</span>}
            </div>
          </div>
          <div className="qr-code">
            {roomInfo?.roomCode && (
              <>
                <img
                  src={generateQrCode(buildJoinLink(roomInfo.roomCode))}
                  alt="QR Code"
                  className="qr-image"
                />
                <p className="qr-label">Escanea para unirte automáticamente</p>
              </>
            )}
          </div>
        </div>
        <div className="players-list">
          <h3 className="players-title">
            Jugadores ({roomInfo?.players.length || 0}/{roomInfo?.maxPlayers || MAX_PLAYERS})
          </h3>
          {getSortedPlayers().map((player, index) => (
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
            Iniciar ronda cronometrada
          </Button>
          <Button onClick={() => setView('menu')} className="leave-button">
            Salir
          </Button>
        </div>
      </motion.div>
    </div>
  );

  const renderGame = () => (
    <div className="multiplayer-game">
      <Background level="expert" />
      <motion.div className="game-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="game-header">
          <div className="question-counter">
            <p>
              Pregunta {roomInfo?.questionNumber}/{roomInfo?.totalQuestions || TOTAL_QUESTIONS}
            </p>
            <div className="question-progress">
              <div className="question-progress-bar" style={{ width: `${progressPercentage}%` }} />
            </div>
          </div>
          <div className="header-timers">
            <div className="round-timer">
              <span>Ronda</span>
              <strong>{roundTimeLeft}s</strong>
            </div>
            <Timer timeRemaining={questionTimeLeft} />
          </div>
        </div>
        <div className="game-layout">
          <div className="question-zone">
            <AnimatePresence mode="wait">
              {showFeedback?.show ? (
                <motion.div
                  key="feedback"
                  className={`feedback ${showFeedback.isCorrect ? 'correct' : 'incorrect'}`}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  {showFeedback.message || (showFeedback.isCorrect ? '✓ ¡Correcto!' : '✗ Incorrecto')}
                </motion.div>
              ) : (
                <motion.div
                  key={roomInfo?.currentQuestion?.id || 'question'}
                  className="question-display"
                  initial={{ x: 100, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -100, opacity: 0 }}
                >
                  <h2 className="question-text">{roomInfo?.currentQuestion?.prompt}</h2>
                  <div className="question-guidelines">
                    <span className="guideline-chip">Solo números</span>
                    <span className="guideline-chip">Máximo 3 dígitos</span>
                    <span className="guideline-chip">15 preguntas rápidas</span>
                  </div>
                  <Input
                    type="text"
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(sanitizeAnswer(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmitAnswer()}
                    placeholder="Tu respuesta"
                    className="answer-input"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={3}
                    disabled={isAnswerLocked}
                  />
                  <Button onClick={handleSubmitAnswer} className="submit-answer-button" disabled={isAnswerLocked}>
                    Enviar Respuesta
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="sidebar-widgets">
            <div className="live-scoreboard">
              <h3 className="scoreboard-title">Marcador en Vivo</h3>
              {getSortedPlayers().map((player, index) => (
                <div
                  key={player.id}
                  className={`score-item rank-${index + 1} ${player.username === playerName ? 'current-player' : ''}`}
                >
                  <span className="rank-badge">#{index + 1}</span>
                  <div className="player-score-info">
                    <span className="player-info">
                      {player.isBot ? '🤖' : '👤'} {player.username}
                    </span>
                    <span className="player-meta">
                      {player.answeredCount || 0}/{roomInfo?.totalQuestions || TOTAL_QUESTIONS} respondidas
                    </span>
                  </div>
                  <span className="score-chip">{player.score} pts</span>
                </div>
              ))}
            </div>
            {renderAssistantChat()}
          </div>
        </div>
      </motion.div>
    </div>
  );

  const renderResults = () => {
    const podium = getSortedPlayers().slice(0, 5);
    return (
      <div className="multiplayer-results">
        <Background level="basic" />
        <motion.div className="results-container" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}>
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
                <div className="medal">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}</div>
                <div className="player-avatar">{player.isBot ? '🤖' : '👤'}</div>
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
                    <span className="stat-value">{player.answeredCount}/{roomInfo?.totalQuestions || TOTAL_QUESTIONS}</span>
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

const generateQrCode = (value: string) => {
  if (!value) return '';
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(value)}`;
};

export default MultiplayerScreen;
