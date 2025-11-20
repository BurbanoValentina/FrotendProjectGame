import { MultiplayerQuestion } from './MultiplayerService';

export interface AIRoomBlueprint {
  roomCode: string;
  hostAlias: string;
  roomGoal: string;
  maxPlayers: number;
  roundDurationSeconds: number;
  questionTimeLimitSeconds: number;
  questions: MultiplayerQuestion[];
}

export interface AIChatMessage {
  id: string;
  sender: 'ai' | 'player';
  text: string;
  timestamp: number;
}

interface AssistantContext {
  roomCode: string;
  playerName: string;
  question?: MultiplayerQuestion | null;
  timeLeft: number;
  totalQuestions: number;
}

/**
 * Servicio liviano que simula a la IA anfitriona del modo multijugador.
 * Se encarga de generar paquetes de preguntas fáciles, blueprint de la sala
 * y respuestas de ayuda en el chat sin depender de servicios externos.
 */
class AITournamentService {
  private static instance: AITournamentService;
  private readonly easyQuestionBank: MultiplayerQuestion[] = [
    { id: 1, prompt: '¿Cuánto es 5 + 7?', answer: 12 },
    { id: 2, prompt: '¿Cuánto es 18 - 9?', answer: 9 },
    { id: 3, prompt: '¿Cuánto es 12 + 15?', answer: 27 },
    { id: 4, prompt: '¿Cuánto es 45 - 28?', answer: 17 },
    { id: 5, prompt: '¿Cuánto es 9 × 6?', answer: 54 },
    { id: 6, prompt: '¿Cuánto es 3 × 7?', answer: 21 },
    { id: 7, prompt: '¿Cuánto es 80 ÷ 8?', answer: 10 },
    { id: 8, prompt: '¿Cuánto es 120 - 45?', answer: 75 },
    { id: 9, prompt: '¿Cuánto es 33 + 14?', answer: 47 },
    { id: 10, prompt: '¿Cuánto es 66 ÷ 6?', answer: 11 },
    { id: 11, prompt: '¿Cuánto es 25 + 30?', answer: 55 },
    { id: 12, prompt: '¿Cuánto es 99 - 42?', answer: 57 },
    { id: 13, prompt: '¿Cuánto es 8 × 8?', answer: 64 },
    { id: 14, prompt: '¿Cuánto es 150 - 81?', answer: 69 },
    { id: 15, prompt: '¿Cuánto es 40 + 23?', answer: 63 },
    { id: 16, prompt: '¿Cuánto es 70 - 22?', answer: 48 },
    { id: 17, prompt: '¿Cuánto es 7 × 9?', answer: 63 },
    { id: 18, prompt: '¿Cuánto es 210 ÷ 7?', answer: 30 },
    { id: 19, prompt: '¿Cuánto es 36 + 12?', answer: 48 },
    { id: 20, prompt: '¿Cuánto es 81 - 18?', answer: 63 },
  ];

  private readonly hostAliases = ['Aurora', 'Vector', 'Atlas', 'Nova', 'Kaia', 'Orion', 'Quanta'];

  static getInstance(): AITournamentService {
    if (!AITournamentService.instance) {
      AITournamentService.instance = new AITournamentService();
    }
    return AITournamentService.instance;
  }

  getBlueprint(roomCode: string, hostPlayerName: string, totalQuestions = 15): AIRoomBlueprint {
    const normalizedCode = roomCode.toUpperCase();
    const hash = this.hashCode(normalizedCode);
    const hostAlias = `${this.hostAliases[hash % this.hostAliases.length]}-${normalizedCode.slice(0, 2)}`;
    const questions = this.buildQuestionSet(normalizedCode, totalQuestions);

    return {
      roomCode: normalizedCode,
      hostAlias,
      roomGoal: `Sala coordinada por IA para sincronizar hasta 30 jugadores. ${hostPlayerName} será co-anfitrión.`,
      maxPlayers: 30,
      roundDurationSeconds: questions.length * 25,
      questionTimeLimitSeconds: 25,
      questions,
    };
  }

  buildJoinUrl(roomCode: string): string {
    if (typeof window === 'undefined') {
      return `ROOM:${roomCode}`;
    }
    const url = new URL(window.location.href);
    url.searchParams.set('roomCode', roomCode.toUpperCase());
    url.searchParams.set('autoJoin', 'true');
    url.hash = '';
    return url.toString();
  }

  sanitizeNumericAnswer(value: string): string {
    return value.replace(/\D/g, '').slice(0, 3);
  }

  async getAssistantReply(message: string, context: AssistantContext): Promise<AIChatMessage> {
    const normalized = message.toLowerCase();
    const questionHint = context.question ? `Recuerda que estamos en la pregunta ${context.question.id} y quedan ${context.timeLeft}s.` : '';
    let reply = 'Estoy aquí para ayudarte. Describe qué parte te causa duda.';

    if (normalized.includes('pista') || normalized.includes('hint')) {
      reply = context.question
        ? `Piensa en dividir el problema en pasos sencillos. ${questionHint}`
        : 'Respira profundo y ve número por número. ¡Puedes lograrlo!';
    } else if (normalized.includes('dificil') || normalized.includes('ayuda')) {
      reply = 'Las preguntas son de máximo tres dígitos. Relee con calma y anota los datos clave.';
    } else if (normalized.includes('codigo') || normalized.includes('qr')) {
      reply = `Comparte este enlace directo: ${this.buildJoinUrl(context.roomCode)}.`;
    } else if (normalized.includes('tiempo')) {
      reply = `La ronda está cronometrada. Aprovecha cada segundo, aún quedan ${context.timeLeft}s antes de pasar a la siguiente.`;
    }

    return {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      text: reply,
      timestamp: Date.now(),
    };
  }

  private buildQuestionSet(roomCode: string, totalQuestions: number): MultiplayerQuestion[] {
    const offset = Math.abs(this.hashCode(roomCode)) % this.easyQuestionBank.length;
    const questions: MultiplayerQuestion[] = [];
    for (let i = 0; i < totalQuestions; i += 1) {
      const question = this.easyQuestionBank[(offset + i) % this.easyQuestionBank.length];
      questions.push({ ...question, id: i + 1 });
    }
    return questions;
  }

  private hashCode(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return hash;
  }
}

export default AITournamentService;
