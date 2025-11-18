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
import CountdownOverlay from "./CountdownOverlay";
import GameSummaryCard from "./GameSummaryCard";
import ChatbotBubble from "./ChatbotBubble";
import { Queue } from "../lib/Queue";
import { LinkedList } from "../lib/LinkedList";
import { Stack } from "../lib/Stack";
import { PanelStateManager } from "../lib/PanelStateManager";
import { LayoutManager } from "../lib/LayoutManager";
import { CircularDoublyLinkedList } from "../lib/CircularDoublyLinkedList";
import confetti from "canvas-confetti";
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
const COUNTDOWN_START = 3;

const PERFORMANCE_LEVELS = [
  {
    min: 12,
    label: "Leyenda",
    description: "¡Rompiste la tabla! Mantén ese ritmo imparable.",
  },
  {
    min: 10,
    label: "Excelente",
    description: "Nivel competitivo asegurado. ¡Sigue así!",
  },
  {
    min: 8,
    label: "Bueno",
    description: "Tu precisión ya mete presión al bot.",
  },
  {
    min: 5,
    label: "Vas mejorando",
    description: "Cada respuesta suma, ¡no te detengas!",
  },
  {
    min: 0,
    label: "Calentando",
    description: "Todos empiezan por aquí. ¡La próxima será mejor!",
  },
];

const BOT_TAUNTS = [
  "¿Eso fue bostezar o pensar?",
  "Vamos, humano, que me duermo...",
  "Estoy respondiendo con una sola mano 😴",
  "¿Seguro que no quieres practicar antes?",
  "Mi procesador está frío, dame pelea",
  "3, 2, 1... oh, ¿sigo esperando tu respuesta?",
  "Me río porque me sobra tiempo 😂",
  "Si sigo ganando, me ascenderán a jefe final",
];

const BOT_SPEED: Record<Difficulty, { min: number; max: number }> = {
  basic: { min: 4, max: 8 },
  advanced: { min: 6, max: 11 },
  expert: { min: 8, max: 14 },
};

type BotMood = "sassy" | "confident" | "panic";

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
  onBack?: () => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ onLogout, onBack }) => {
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
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [summaryVisible, setSummaryVisible] = useState(false);
  const [summaryLabel, setSummaryLabel] = useState("Calentando");
  const [summaryDescription, setSummaryDescription] = useState("");
  const [summaryStats, setSummaryStats] = useState<{ correct: number; total: number; score: number; botScore: number }>({
    correct: 0,
    total: 0,
    score: 0,
    botScore: 0,
  });
  const [botScore, setBotScore] = useState(0);
  const [botSolved, setBotSolved] = useState(0);
  const [botMessage, setBotMessage] = useState("Listo para jugar 🤖");
  const [botMood, setBotMood] = useState<BotMood>("sassy");
  const [botActive, setBotActive] = useState(false);
  const countdownIntervalRef = useRef<number | null>(null);
  const botIntervalRef = useRef<number | null>(null);
  const tauntListRef = useRef(new CircularDoublyLinkedList<string>());
  const botTauntPointerRef = useRef<string | null>(null);
  const tensionAudioCtxRef = useRef<AudioContext | null>(null);
  const lastTickRef = useRef(0);
  const botMoodRef = useRef<BotMood>("sassy");

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
    () => import.meta.env.VITE_API_URL ?? "https://web-k1y5lmjwwpdm.up-de-fra1-k8s-1.apps.run-on-seenode.com",
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
    setSummaryVisible(false);
    setSummaryStats({ correct: 0, total: 0, score: 0, botScore: 0 });
    setSummaryLabel("Calentando");
    setSummaryDescription("");
    setBotScore(0);
    setBotSolved(0);
    setBotActive(false);
    setCountdownValue(null);
    setShowCountdown(false);
    const firstTaunt = tauntListRef.current.getHeadValue();
    if (firstTaunt) {
      setBotMessage(firstTaunt);
      botTauntPointerRef.current = firstTaunt;
    } else {
      setBotMessage("Listo para jugar 🤖");
      botTauntPointerRef.current = null;
    }
    historyStack.current = new Stack<HistoryEntry>();
    setHistory([]);
    questionQueue.current = new Queue<Question>();
    populateQueue();
    advanceQuestion();
  }, [advanceQuestion, difficulty, populateQueue]);

  useEffect(() => {
    const list = tauntListRef.current;
    if (!list.getHeadValue()) {
      BOT_TAUNTS.forEach((taunt) => list.add(taunt));
    }
    const headValue = list.getHeadValue();
    if (headValue) {
      botTauntPointerRef.current = headValue;
      setBotMessage(headValue);
    }
  }, []);

  const cycleTaunt = useCallback(() => {
    const nextValue = tauntListRef.current.getNextValue(botTauntPointerRef.current);
    botTauntPointerRef.current = nextValue;
    return nextValue ?? "Te espero en la línea de meta 🤖";
  }, []);

  const clearCountdown = useCallback(() => {
    if (countdownIntervalRef.current) {
      window.clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const stopBot = useCallback(() => {
    if (botIntervalRef.current) {
      window.clearInterval(botIntervalRef.current);
      botIntervalRef.current = null;
    }
    setBotActive(false);
  }, []);

  const startBot = useCallback(() => {
    stopBot();
    setBotScore(0);
    setBotSolved(0);
    setBotActive(true);
    const openingTaunt = cycleTaunt();
    if (openingTaunt) {
      setBotMessage(openingTaunt);
    }
    botIntervalRef.current = window.setInterval(() => {
      const solvedBoost = randomInt(1, 2);
      const { min, max } = BOT_SPEED[difficulty];
      setBotSolved((prev) => prev + solvedBoost);
      setBotScore((prev) => prev + solvedBoost * SCORE_PER_CORRECT + randomInt(min, max));
      if (botMoodRef.current === "sassy") {
        setBotMessage(cycleTaunt());
      }
    }, 3200);
  }, [cycleTaunt, difficulty, stopBot]);

  useEffect(() => {
    return () => {
      stopBot();
      clearCountdown();
      if (tensionAudioCtxRef.current) {
        tensionAudioCtxRef.current.close();
      }
    };
  }, [clearCountdown, stopBot]);

  useEffect(() => {
    botMoodRef.current = botMood;
  }, [botMood]);

  const ensureAudioContext = useCallback(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const extendedWindow = window as Window & typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };
    const ContextClass = window.AudioContext || extendedWindow.webkitAudioContext;
    if (!ContextClass) {
      return null;
    }
    if (!tensionAudioCtxRef.current) {
      tensionAudioCtxRef.current = new ContextClass();
    }
    if (tensionAudioCtxRef.current.state === "suspended") {
      void tensionAudioCtxRef.current.resume();
    }
    return tensionAudioCtxRef.current;
  }, []);

  const playPressureTick = useCallback(() => {
    const ctx = ensureAudioContext();
    if (!ctx) {
      return;
    }
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(900, ctx.currentTime);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
  }, [ensureAudioContext]);

  useEffect(() => {
    if (!gameActive) {
      return;
    }
    if (timeRemaining === 0 || timeRemaining > 10) {
      return;
    }
    const now = Date.now();
    if (now - lastTickRef.current < 400) {
      return;
    }
    lastTickRef.current = now;
    playPressureTick();
  }, [gameActive, playPressureTick, timeRemaining]);

  const launchConfetti = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }
    const duration = 1600;
    const animationEnd = Date.now() + duration;

    const interval = window.setInterval(() => {
      confetti({
        particleCount: 45,
        startVelocity: 40,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
      });

      if (Date.now() > animationEnd) {
        window.clearInterval(interval);
      }
    }, 250);
  }, []);

  const getPerformanceLevel = useCallback((correct: number) => {
    return (
      PERFORMANCE_LEVELS.find((level) => correct >= level.min) ??
      PERFORMANCE_LEVELS[PERFORMANCE_LEVELS.length - 1]
    );
  }, []);

  useEffect(() => {
    if (!botActive || !gameActive) {
      setBotMood("sassy");
      return;
    }
    if (score - botScore >= 20) {
      setBotMood("panic");
      return;
    }
    if (botScore - score >= 20) {
      setBotMood("confident");
      return;
    }
    setBotMood("sassy");
  }, [botActive, botScore, gameActive, score]);

  useEffect(() => {
    if (!botActive) {
      return;
    }
    if (botMood === "panic") {
      setBotMessage("¡Me estás dejando atrás! 😳");
    } else if (botMood === "confident") {
      setBotMessage("Creo que te estoy ganando 😎");
    }
  }, [botActive, botMood]);

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

  const startGameSession = useCallback(async () => {
    if (gameActive) {
      setIsStarting(false);
      return;
    }
    const trimmedName = (playerName || "Invitado").trim() || "Invitado";
    setPlayerName(trimmedName);
    setError(null);
    setStatusMessage(null);
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
      startBot();
      setStatusMessage("¡Vamos! Dale con todo 💪");
    } catch (err) {
      setError("No se pudo iniciar la partida.");
      setShowCountdown(false);
      setCountdownValue(null);
    } finally {
      setIsStarting(false);
    }
  }, [apiUrl, difficulty, gameActive, playerName, resetGameState, startBot]);

  const handleStartRequest = useCallback(() => {
    if (gameActive || isStarting || showCountdown) {
      return;
    }
    const trimmedName = (playerName || "").trim();
    if (!trimmedName) {
      setStatusMessage("Ingresa un nombre válido antes de iniciar 🤓");
      return;
    }
    ensureAudioContext();
    setPlayerName(trimmedName);
    setSummaryVisible(false);
    setIsStarting(true);
    setShowCountdown(true);
    setCountdownValue(COUNTDOWN_START);
    setStatusMessage("Cuenta regresiva... respira hondo");
    clearCountdown();
    countdownIntervalRef.current = window.setInterval(() => {
      setCountdownValue((prev) => {
        if (prev === null) {
          return null;
        }
        if (prev <= 1) {
          clearCountdown();
          setTimeout(() => {
            setShowCountdown(false);
            setCountdownValue(null);
            startGameSession();
          }, 600);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown, ensureAudioContext, gameActive, isStarting, playerName, showCountdown, startGameSession]);

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
    if (!gameActive) {
      return;
    }
    setGameActive(false);
    stopBot();
    setSaving(true);
    const durationSeconds = computeDurationSeconds();

    await persistGameState(score, correctAnswers, totalQuestions, durationSeconds);

    if (currentUser && score > currentUser.highScore) {
      await authService.updateHighScore(currentUser.id, score);
    }

    startTimestampRef.current = null;
    setSaving(false);
    setSessionId(null);
    const performance = getPerformanceLevel(correctAnswers);
    setSummaryStats({ correct: correctAnswers, total: totalQuestions, score, botScore });
    setSummaryLabel(performance.label);
    setSummaryDescription(performance.description);
    setSummaryVisible(true);
    setStatusMessage("Partida finalizada. Mira tu resumen ✨");
    launchConfetti();
  }, [
    authService,
    botScore,
    computeDurationSeconds,
    correctAnswers,
    currentUser,
    gameActive,
    getPerformanceLevel,
    launchConfetti,
    persistGameState,
    score,
    stopBot,
    totalQuestions,
  ]);

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
      <CountdownOverlay value={countdownValue} visible={showCountdown} />

      <div className="game-container">
        {/* Left Column: Game Panel */}
        <div className="game-panel-container">
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
                  disabled={!gameActive || saving}
                  className="secondary"
                >
                  🏁 Fin
                </Button>
              </div>
              <Button
                onClick={handleStartRequest}
                disabled={gameActive || isStarting || showCountdown}
                className="ghost"
              >
                {showCountdown
                  ? "Cuenta regresiva..."
                  : isStarting
                  ? "⏳ Preparando partida..."
                  : "🎬 Iniciar partida"}
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
            <GameSummaryCard
              visible={summaryVisible}
              correctAnswers={summaryStats.correct}
              totalQuestions={summaryStats.total}
              score={summaryStats.score}
              botScore={summaryStats.botScore}
              performanceLabel={summaryLabel}
              performanceDescription={summaryDescription}
              onClose={() => setSummaryVisible(false)}
              onPlayAgain={() => {
                setSummaryVisible(false);
                handleStartRequest();
              }}
            />
          </Card>
        </motion.div>
        </div>

        {/* Right Column: User Header + Stats + History + Leaderboard */}
        <div className="user-header-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="user-header game-card">
            {currentUser && (
              <>
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
              <div className="game-navigation-buttons">
                {onBack && (
                  <button className="back-button" onClick={onBack}>
                    ← Volver
                  </button>
                )}
                {onLogout && (
                  <button className="logout-button" onClick={onLogout}>
                    🚪 Salir
                  </button>
                )}
              </div>
              </>
            )}
            </Card>
          </motion.div>
        </div>

        <div className="stats-panel-container">
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
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <span>🤖 Puntaje bot</span>
                <strong>{botScore}</strong>
              </motion.div>
            </div>
          </Card>
        </motion.div>
        </div>

        <div className="chatbot-container">
          <ChatbotBubble
            message={botMessage}
            botScore={botScore}
            botSolved={botSolved}
            playerScore={score}
            isActive={botActive && gameActive}
            mood={botMood}
          />
        </div>

        <div className="history-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
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
        </div>

        <div className="leaderboard-container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
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
    </div>
  );
};

export default GameScreen;
