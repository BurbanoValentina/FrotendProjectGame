import React, {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import Timer from "./Timer";
import Background from "./Background";
import { Queue } from "../lib/Queue";
import { LinkedList } from "../lib/LinkedList";
import { Stack } from "../lib/Stack";
import { PanelStateManager } from "../lib/PanelStateManager";
import { LayoutManager, PanelConfig } from "../lib/LayoutManager";
import "../styles/GameScreen.css";

type Difficulty = "basic" | "advanced" | "expert";

type Question = {
  prompt: string;
  answer: number;
};

type GameResult = {
  id: number;
  playerName: string;
  difficulty: Difficulty;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  durationSeconds: number;
  createdAt: string;
};

type HistoryEntry = {
  question: string;
  playerAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  timestamp: string;
};

const DIFFICULTY_TIME: Record<Difficulty, number> = {
  basic: 60,
  advanced: 45,
  expert: 30,
};

const SCORE_PER_CORRECT = 10;

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const generateQuestion = (difficulty: Difficulty): Question => {
  const operationSeed = Math.random();

  if (difficulty === "basic") {
    const a = randomInt(1, 30);
    const b = randomInt(1, 30);
    const operation = operationSeed > 0.5 ? "+" : "-";
    if (operation === "-") {
      const [maxValue, minValue] = a >= b ? [a, b] : [b, a];
      return { prompt: `${maxValue} - ${minValue}`, answer: maxValue - minValue };
    }
    return { prompt: `${a} + ${b}`, answer: a + b };
  }

  if (difficulty === "advanced") {
    const a = randomInt(2, 12);
    const b = randomInt(2, 12);
    if (operationSeed > 0.5) {
      return { prompt: `${a} * ${b}`, answer: a * b };
    }
    const c = randomInt(10, 40);
    return { prompt: `${a * b} - ${c}`, answer: a * b - c };
  }

  const a = randomInt(5, 25);
  const b = randomInt(2, 12);
  if (operationSeed > 0.66) {
    const extra = randomInt(5, 20);
    return { prompt: `${a} + ${b} * ${extra}`, answer: a + b * extra };
  }
  if (operationSeed > 0.33) {
    const divisor = randomInt(2, 9);
    const dividend = divisor * randomInt(5, 15);
    return { prompt: `${dividend} / ${divisor}`, answer: dividend / divisor };
  }
  const subtrahend = randomInt(1, a);
  return { prompt: `(${a} + ${b}) - ${subtrahend}`, answer: a + b - subtrahend };
};

import AuthService from "../services/AuthService";

interface GameScreenProps {
  onLogout?: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ onLogout }) => {
  const authService = AuthService.getInstance();
  const currentUser = authService.getCurrentUser();
  const [playerName, setPlayerName] = useState(currentUser?.nickname || "Invitado");
  const [difficulty, setDifficulty] = useState<Difficulty>("basic");
  const [games, setGames] = useState<GameResult[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [userAnswer, setUserAnswer] = useState("");
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(DIFFICULTY_TIME.basic);
  const [gameActive, setGameActive] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "incorrect" | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [bestScore, setBestScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  
  // Gestor de estados de paneles usando Map (HashMap)
  const panelManager = useRef(new PanelStateManager({
    'history': false,
    'leaderboard': false
  }));
  const [panelStates, setPanelStates] = useState(panelManager.current.getAllStates());

  // Gestor de layout usando Array de configuraciones
  const layoutManager = useRef(new LayoutManager([
    {
      id: 'game-panel',
      name: 'Desafío Matemático',
      order: 0,
      visible: true,
      priority: 'high',
      minHeight: 550
    },
    {
      id: 'stats-panel',
      name: 'Estadísticas',
      order: 1,
      visible: true,
      priority: 'high',
      minHeight: 200
    },
    {
      id: 'history-panel',
      name: 'Historial Stack',
      order: 2,
      visible: true,
      priority: 'medium',
      minHeight: 150
    },
    {
      id: 'leaderboard-panel',
      name: 'Historial LinkedList',
      order: 3,
      visible: true,
      priority: 'medium',
      minHeight: 150
    }
  ]));

  const apiUrl = useMemo(
    () => import.meta.env.VITE_API_URL ?? "http://localhost:8080",
    []
  );

  // Función para alternar el estado de un panel usando PanelStateManager
  const togglePanel = useCallback((panelId: string) => {
    panelManager.current.togglePanel(panelId);
    setPanelStates(panelManager.current.getAllStates());
  }, []);

  // Estructuras de datos utilizadas:
  // - Queue: Cola para gestionar preguntas pendientes (FIFO)
  // - Stack: Pila para historial de intentos (LIFO)
  // - LinkedList: Lista enlazada para el leaderboard
  // - Map (HashMap): PanelStateManager para gestionar estado de paneles expandidos/colapsados
  // - Array: LayoutManager para gestionar orden y configuración de paneles del layout
  const questionQueue = useRef(new Queue<Question>());
  const startTimestampRef = useRef<number | null>(null);
  const historyStack = useRef(new Stack<HistoryEntry>());
  const autostartGuardRef = useRef(false);

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/games`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data: GameResult[] = await response.json();
      setGames(data);
      const maxScore = data.reduce((max, game) => Math.max(max, game.score), 0);
      setBestScore(maxScore);
      setError(null);
    } catch (err) {
      setError("No se pudo obtener la lista de resultados.");
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  const populateQueue = useCallback(() => {
    const queue = questionQueue.current;
    while (queue.size() < 8) {
      queue.enqueue(generateQuestion(difficulty));
    }
  }, [difficulty]);

  const advanceQuestion = useCallback(() => {
    const queue = questionQueue.current;
    if (queue.isEmpty()) {
      populateQueue();
    }
    const next = queue.dequeue();
    setCurrentQuestion(next ?? generateQuestion(difficulty));
  }, [difficulty, populateQueue]);

  const resetGameState = useCallback(() => {
    setScore(0);
    setCorrectAnswers(0);
    setTotalQuestions(0);
    setUserAnswer("");
    setFeedback(null);
    setStatusMessage(null);
    setTimeRemaining(DIFFICULTY_TIME[difficulty]);
    setStreak(0);
    setBestStreak(0);
    historyStack.current = new Stack<HistoryEntry>();
    setHistory([]);
    questionQueue.current = new Queue<Question>();
    populateQueue();
    advanceQuestion();
  }, [advanceQuestion, difficulty, populateQueue]);

  const computeDurationSeconds = useCallback(() => {
    if (!startTimestampRef.current) {
      return 0;
    }
    const elapsed = Date.now() - startTimestampRef.current;
    return Math.max(1, Math.round(elapsed / 1000));
  }, []);

  const persistGameState = useCallback(
    async (
      scoreValue: number,
      correctValue: number,
      totalValue: number,
      durationValue: number
    ) => {
      if (!sessionId) {
        return;
      }
      try {
        const response = await fetch(`${apiUrl}/games/${sessionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            score: scoreValue,
            correctAnswers: correctValue,
            totalQuestions: totalValue,
            durationSeconds: durationValue,
          }),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        await fetchGames();
        setError(null);
      } catch (err) {
        setError("No se pudo sincronizar el resultado con el servidor.");
      }
    },
    [apiUrl, fetchGames, sessionId]
  );

  const startGame = useCallback(async () => {
    if (gameActive || isStarting) {
      return;
    }
    const trimmedName = (playerName || "Invitado").trim();
    setPlayerName(trimmedName);
    setIsStarting(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/games/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerName: trimmedName,
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const newSession: GameResult = await response.json();
      setSessionId(newSession.id);
      resetGameState();
      startTimestampRef.current = Date.now();
      setGameActive(true);
      setSaving(false);
    } catch (err) {
      setError("No se pudo iniciar la partida.");
    } finally {
      setIsStarting(false);
    }
  }, [apiUrl, difficulty, gameActive, isStarting, playerName, resetGameState]);

  useEffect(() => {
    if (!autostartGuardRef.current) {
      autostartGuardRef.current = true;
      startGame();
    }
  }, [startGame]);

  const handleAnswerChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUserAnswer(event.target.value);
  };

  const handleAnswerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSubmitAnswer();
    }
  };

  const handlePlayerNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setPlayerName(event.target.value);
  };

  const handleDifficultyChange = (value: Difficulty) => {
    if (gameActive) {
      return;
    }
    setDifficulty(value);
    setTimeRemaining(DIFFICULTY_TIME[value]);
  };

  const handleSubmitAnswer = () => {
    if (!gameActive || !currentQuestion) {
      return;
    }

    const trimmedAnswer = userAnswer.trim();
    if (!trimmedAnswer) {
      setFeedback("incorrect");
      return;
    }

    const parsedAnswer = Number(trimmedAnswer);
    if (Number.isNaN(parsedAnswer)) {
      setFeedback("incorrect");
      setUserAnswer("");
      return;
    }

    const isCorrect = parsedAnswer === currentQuestion.answer;
    const newTotal = totalQuestions + 1;
    const newCorrect = isCorrect ? correctAnswers + 1 : correctAnswers;
    const newScore = isCorrect ? score + SCORE_PER_CORRECT : score;
    const newStreak = isCorrect ? streak + 1 : 0;
    const durationSeconds = computeDurationSeconds();

    setTotalQuestions(newTotal);
    setCorrectAnswers(newCorrect);
    setScore(newScore);
    setStreak(newStreak);
    setBestStreak((prev) => Math.max(prev, newStreak));
    setFeedback(isCorrect ? "correct" : "incorrect");
    setStatusMessage(null);

    const historyEntry: HistoryEntry = {
      question: currentQuestion.prompt,
      playerAnswer: parsedAnswer,
      correctAnswer: currentQuestion.answer,
      isCorrect,
      timestamp: new Date().toLocaleTimeString(),
    };
    historyStack.current.push(historyEntry);
    setHistory((previous) => [historyEntry, ...previous].slice(0, 5));

    persistGameState(newScore, newCorrect, newTotal, durationSeconds);

    setUserAnswer("");
    advanceQuestion();
  };

  const finishGame = useCallback(async () => {
    if (!sessionId) {
      setGameActive(false);
      return;
    }

    setGameActive(false);
    setSaving(true);
    const durationSeconds = computeDurationSeconds();

    await persistGameState(score, correctAnswers, totalQuestions, durationSeconds);
    
    // Actualizar high score en el backend si el usuario está logueado
    if (currentUser && score > currentUser.highScore) {
      await authService.updateHighScore(currentUser.id, score);
    }
    
    startTimestampRef.current = null;
    setSaving(false);
    setSessionId(null);
    setStatusMessage("Partida sincronizada. ¡Puedes iniciar otra!");
    setTimeout(() => {
      startGame();
    }, 1200);
  }, [computeDurationSeconds, correctAnswers, persistGameState, score, sessionId, startGame, totalQuestions]);

  useEffect(() => {
    if (!gameActive) {
      return;
    }

    if (timeRemaining === 0) {
      finishGame();
      return;
    }

    const timerId = window.setInterval(() => {
      setTimeRemaining((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [finishGame, gameActive, timeRemaining]);

  useEffect(() => {
    if (!gameActive) {
      setTimeRemaining(DIFFICULTY_TIME[difficulty]);
    }
  }, [difficulty, gameActive]);

  const leaderboard = useMemo(() => {
    const list = new LinkedList<GameResult>();
    for (let i = games.length - 1; i >= 0; i -= 1) {
      list.add(games[i]);
    }
    return list.toArray().slice(0, 10);
  }, [games]);

  const operationsInQueue = questionQueue.current.size();

  return (
    <div className="game-screen">
      <Background level={difficulty} />
      
      {/* User Header */}
      {currentUser && (
        <motion.div
          className="user-header"
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="user-info">
            <span className="user-icon">👤</span>
            <div className="user-details">
              <span className="user-nickname">{currentUser.nickname}</span>
              <span className="user-username">@{currentUser.username}</span>
            </div>
            <div className="user-score">
              <span className="trophy-icon">🏆</span>
              <span className="high-score">{currentUser.highScore}</span>
            </div>
          </div>
          {onLogout && (
            <button className="logout-button" onClick={onLogout}>
              🚪 Salir
            </button>
          )}
        </motion.div>
      )}
      
      <div className="game-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card className="game-panel game-card">
          <motion.div
            className="panel-header"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1>🎯 Desafío Matemático</h1>
            <Timer timeRemaining={timeRemaining} />
          </motion.div>

          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <p className="player-label">
              Jugador:
              <Input
                value={playerName}
                onChange={handlePlayerNameChange}
                placeholder="Nombre del jugador"
                className="player-input"
                disabled={gameActive}
              />
            </p>
          </motion.div>

          <motion.div
            className="difficulty-selector"
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              onClick={() => handleDifficultyChange("basic")}
              disabled={gameActive}
              className={difficulty === "basic" ? "selected" : ""}
            >
              🌟 Básica
            </Button>
            <Button
              onClick={() => handleDifficultyChange("advanced")}
              disabled={gameActive}
              className={difficulty === "advanced" ? "selected" : ""}
            >
              🔥 Avanzada
            </Button>
            <Button
              onClick={() => handleDifficultyChange("expert")}
              disabled={gameActive}
              className={difficulty === "expert" ? "selected" : ""}
            >
              💎 Experta
            </Button>
          </motion.div>

          <motion.div
            className="question-wrapper"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
          >
            <h2>📝 Resuelve:</h2>
            <motion.p
              className="question-display"
              key={currentQuestion?.prompt}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {currentQuestion ? currentQuestion.prompt : "⏳ Generando desafío..."}
            </motion.p>
            <Input
              value={userAnswer}
              onChange={handleAnswerChange}
              placeholder="Escribe tu resultado"
              type="number"
              onKeyDown={handleAnswerKeyDown}
              className="answer-input"
            />
            <div className="action-buttons">
              <Button
                onClick={handleSubmitAnswer}
                disabled={!gameActive || !currentQuestion || isStarting}
                className="primary"
              >
                ✓ Comprobar resultado
              </Button>
              <Button
                onClick={finishGame}
                disabled={isStarting || saving}
                className="secondary"
              >
                ⏹ Terminar partida
              </Button>
            </div>
            <Button
              onClick={startGame}
              disabled={gameActive || isStarting}
              className="ghost"
            >
              {isStarting ? "⏳ Preparando partida..." : "🎮 Nueva partida"}
            </Button>
          </motion.div>

          <div className="feedback-area">
            {feedback && (
              <motion.p
                className={`feedback feedback-${feedback}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {feedback === "correct" ? "🎉 ¡Excelente!" : "❌ Respuesta incorrecta."}
              </motion.p>
            )}
            {statusMessage && (
              <motion.p
                className="status-message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {statusMessage}
              </motion.p>
            )}
            {error && (
              <motion.p
                className="error-message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}
            {saving && (
              <motion.p
                className="status-message"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                💾 Sincronizando con la base de datos...
              </motion.p>
            )}
          </div>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="stats-panel game-card">
            <h2>📊 Panel de progreso</h2>
          <div className="stats-grid">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span>🎯 Puntaje</span>
              <strong>{score}</strong>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span>🏆 Mejor puntaje</span>
              <strong>{bestScore}</strong>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span>📈 Dificultad</span>
              <strong>{difficulty}</strong>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span>🔥 Racha</span>
              <strong>{streak}</strong>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span>⚡ Mejor racha</span>
              <strong>{bestStreak}</strong>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span>📦 Cola (Queue)</span>
              <strong>{operationsInQueue}</strong>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span>✅ Resueltas</span>
              <strong>{totalQuestions}</strong>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span>⏱️ Tiempo restante</span>
              <strong>{timeRemaining}s</strong>
            </motion.div>
          </div>
        </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="history-container"
        >
          <Card className="history-panel game-card horizontal">
            <div className="history-header">
              <h2>
                📜 Intentos recientes
                <span className="data-structure-badge" title="Estructura: Stack (Pila LIFO - Last In First Out)">
                  Stack
                </span>
              </h2>
              <button 
                className="toggle-history-btn"
                onClick={() => togglePanel('history')}
                aria-label={panelStates.history ? "Colapsar historial" : "Expandir historial"}
              >
                {panelStates.history ? "▼" : "▶"}
              </button>
            </div>
            {panelStates.history && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {history.length === 0 ? (
                  <p>Aún no hay intentos registrados.</p>
                ) : (
                  <ul className="history-list horizontal">
                    {history.map((entry, index) => (
                      <motion.li
                        key={`${entry.timestamp}-${index}`}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <span className={entry.isCorrect ? "correct" : "incorrect"}>
                          {entry.isCorrect ? "✔" : "✘"}
                        </span>
                        <span className="history-question">{entry.question}</span>
                        <span className="history-answer">Tu: {entry.playerAnswer}</span>
                        <span className="history-answer">✓: {entry.correctAnswer}</span>
                        <span className="history-time">{entry.timestamp}</span>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="leaderboard-container"
        >
          <Card className="leaderboard-panel game-card horizontal">
            <div className="leaderboard-header">
              <h2>
                🏅 Historial reciente
                <span className="data-structure-badge" title="Estructura: LinkedList (Lista Enlazada)">
                  LinkedList
                </span>
              </h2>
              <button 
                className="toggle-leaderboard-btn"
                onClick={() => togglePanel('leaderboard')}
                aria-label={panelStates.leaderboard ? "Colapsar historial" : "Expandir historial"}
              >
                {panelStates.leaderboard ? "▼" : "▶"}
              </button>
            </div>
            {panelStates.leaderboard && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {loading ? (
                  <p>⏳ Cargando resultados...</p>
                ) : leaderboard.length === 0 ? (
                  <p>Aún no hay intentos registrados.</p>
                ) : (
                  <ul className="leaderboard-list horizontal">
                    {leaderboard.map((game, index) => (
                      <motion.li
                        key={game.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="leaderboard-player">
                          <strong>👤 {game.playerName}</strong>
                          <span className="difficulty-badge">{game.difficulty}</span>
                        </div>
                        <div className="leaderboard-score">
                          🎯 Puntaje: <strong>{game.score}</strong>
                        </div>
                        <div className="leaderboard-stats">
                          ✅ Aciertos: {game.correctAnswers}/{game.totalQuestions}
                        </div>
                        <div className="leaderboard-time">
                          ⏱️ {game.durationSeconds}s
                        </div>
                        <div className="leaderboard-date">
                          📅 {game.createdAt
                            ? new Date(game.createdAt).toLocaleDateString('es-ES', { 
                                day: '2-digit', 
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : "Sin fecha"}
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                )}
              </motion.div>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default GameScreen;
