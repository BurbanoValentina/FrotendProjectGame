import React, {
  ChangeEvent,
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Button from "./Button";
import Card from "./Card";
import Input from "./Input";
import Timer from "./Timer";
import Background from "./Background";
import { Queue } from "../lib/Queue";
import { LinkedList } from "../lib/LinkedList";
import { Stack } from "../lib/Stack";

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

  const apiUrl = useMemo(
    () => import.meta.env.VITE_API_URL ?? "http://localhost:8080",
    []
  );

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
        <div className="user-header">
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
        </div>
      )}
      
      <div className="game-container">
        <Card className="game-panel">
          <div className="panel-header">
            <h1>Desafío matemático</h1>
            <Timer timeRemaining={timeRemaining} />
          </div>

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

          <div className="difficulty-selector">
            <Button
              onClick={() => handleDifficultyChange("basic")}
              disabled={gameActive}
              className={difficulty === "basic" ? "selected" : ""}
            >
              Básica
            </Button>
            <Button
              onClick={() => handleDifficultyChange("advanced")}
              disabled={gameActive}
              className={difficulty === "advanced" ? "selected" : ""}
            >
              Avanzada
            </Button>
            <Button
              onClick={() => handleDifficultyChange("expert")}
              disabled={gameActive}
              className={difficulty === "expert" ? "selected" : ""}
            >
              Experta
            </Button>
          </div>

          <div className="question-wrapper">
            <h2>Resuelve:</h2>
            <p className="question-display">
              {currentQuestion ? currentQuestion.prompt : "Generando desafío..."}
            </p>
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
                Comprobar resultado
              </Button>
              <Button
                onClick={finishGame}
                disabled={isStarting || saving}
                className="secondary"
              >
                Terminar partida
              </Button>
            </div>
            <Button
              onClick={startGame}
              disabled={gameActive || isStarting}
              className="ghost"
            >
              {isStarting ? "Preparando partida..." : "Nueva partida"}
            </Button>
          </div>

          <div className="feedback-area">
            {feedback && (
              <p className={`feedback feedback-${feedback}`}>
                {feedback === "correct" ? "¡Excelente!" : "Respuesta incorrecta."}
              </p>
            )}
            {statusMessage && <p className="status-message">{statusMessage}</p>}
            {error && <p className="error-message">{error}</p>}
            {saving && <p className="status-message">Sincronizando con la base de datos...</p>}
          </div>
        </Card>

        <Card className="stats-panel">
          <h2>Panel de progreso</h2>
          <div className="stats-grid">
            <div>
              <span>Puntaje</span>
              <strong>{score}</strong>
            </div>
            <div>
              <span>Mejor puntaje</span>
              <strong>{bestScore}</strong>
            </div>
            <div>
              <span>Dificultad</span>
              <strong>{difficulty}</strong>
            </div>
            <div>
              <span>Racha</span>
              <strong>{streak}</strong>
            </div>
            <div>
              <span>Mejor racha</span>
              <strong>{bestStreak}</strong>
            </div>
            <div>
              <span>Operaciones en cola</span>
              <strong>{operationsInQueue}</strong>
            </div>
            <div>
              <span>Resueltas</span>
              <strong>{totalQuestions}</strong>
            </div>
            <div>
              <span>Tiempo restante</span>
              <strong>{timeRemaining}s</strong>
            </div>
          </div>
        </Card>

        <Card className="history-panel">
          <h2>Intentos recientes</h2>
          {history.length === 0 ? (
            <p>Aún no hay intentos registrados.</p>
          ) : (
            <ul className="history-list">
              {history.map((entry, index) => (
                <li key={`${entry.timestamp}-${index}`}>
                  <span className={entry.isCorrect ? "correct" : "incorrect"}>
                    {entry.isCorrect ? "✔" : "✘"}
                  </span>
                  <span className="history-question">{entry.question}</span>
                  <span className="history-answer">Tu respuesta: {entry.playerAnswer}</span>
                  <span className="history-answer">Correcta: {entry.correctAnswer}</span>
                  <span className="history-time">{entry.timestamp}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="leaderboard-panel">
          <h2>Historial reciente</h2>
          {loading ? (
            <p>Cargando resultados...</p>
          ) : leaderboard.length === 0 ? (
            <p>Aún no hay intentos registrados.</p>
          ) : (
            <ul className="leaderboard-list">
              {leaderboard.map((game) => (
                <li key={game.id}>
                  <div>
                    <strong>{game.playerName}</strong> — {game.difficulty}
                  </div>
                  <div>
                    Puntaje: {game.score} · Aciertos: {game.correctAnswers}/{game.totalQuestions}
                  </div>
                  <div>
                    Duración: {game.durationSeconds}s — {game.createdAt
                      ? new Date(game.createdAt).toLocaleString()
                      : "Sin fecha"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default GameScreen;
