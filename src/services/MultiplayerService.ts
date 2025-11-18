import { Queue } from '../lib/Queue';

export interface MultiplayerPlayer {
  id: string;
  username: string;
  score: number;
  answeredCount: number;
  averageTime?: number;
  isBot?: boolean;
  isReady?: boolean;
}

export interface MultiplayerQuestion {
  id: number;
  prompt: string;
  answer: number;
}

export interface MultiplayerRoom {
  roomCode: string;
  players: MultiplayerPlayer[];
  questions?: MultiplayerQuestion[];
  currentQuestionIndex: number;
  status: 'WAITING' | 'PLAYING' | 'FINISHED';
  hostPlayerId: string;
}

export interface CreateRoomResponse {
  success: boolean;
  roomCode: string;
  room: MultiplayerRoom;
  message: string;
}

export interface JoinRoomResponse {
  success: boolean;
  room: MultiplayerRoom;
  message: string;
}

export interface StartGameResponse {
  success: boolean;
  room: MultiplayerRoom;
  currentQuestion: MultiplayerQuestion;
  message: string;
}

export interface SubmitAnswerResponse {
  success: boolean;
  room: MultiplayerRoom;
  currentQuestion: MultiplayerQuestion | null;
  isFinished: boolean;
  ranking?: MultiplayerPlayer[];
  message?: string;
}

export interface RankingResponse {
  success: boolean;
  ranking: MultiplayerPlayer[];
}

/**
 * Servicio para el modo multijugador
 * Patrón: Singleton + Repository Pattern
 */
class MultiplayerService {
  private static instance: MultiplayerService;
  private readonly API_URL = 'https://web-k1y5lmjwwpdm.up-de-fra1-k8s-1.apps.run-on-seenode.com/api/multiplayer';
  
  // Cola para gestionar las solicitudes
  private requestQueue: Queue<Promise<any>>;
  
  private constructor() {
    this.requestQueue = new Queue<Promise<any>>();
  }

  public static getInstance(): MultiplayerService {
    if (!MultiplayerService.instance) {
      MultiplayerService.instance = new MultiplayerService();
    }
    return MultiplayerService.instance;
  }

  /**
   * Crea una nueva sala de juego
   */
  async createRoom(playerId: string, username: string): Promise<CreateRoomResponse> {
    try {
      const response = await fetch(`${this.API_URL}/rooms/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerId, username }),
      });

      const data: CreateRoomResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error al crear la sala');
      }

      return data;
    } catch (error) {
      console.error('Error creating room:', error);
      return {
        success: false,
        roomCode: '',
        room: {} as MultiplayerRoom,
        message: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Unirse a una sala existente
   */
  async joinRoom(roomCode: string, playerId: string, username: string): Promise<JoinRoomResponse> {
    try {
      const response = await fetch(`${this.API_URL}/rooms/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomCode, playerId, username }),
      });

      const data: JoinRoomResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error al unirse a la sala');
      }

      return data;
    } catch (error) {
      console.error('Error joining room:', error);
      return {
        success: false,
        room: {} as MultiplayerRoom,
        message: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Iniciar el juego en una sala
   */
  async startGame(roomCode: string): Promise<StartGameResponse> {
    try {
      const response = await fetch(`${this.API_URL}/rooms/${roomCode}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: StartGameResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Error al iniciar el juego');
      }

      return data;
    } catch (error) {
      console.error('Error starting game:', error);
      return {
        success: false,
        room: {} as MultiplayerRoom,
        currentQuestion: {} as MultiplayerQuestion,
        message: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Enviar una respuesta
   */
  async submitAnswer(
    roomCode: string,
    playerId: string,
    answer: number,
    responseTime: number
  ): Promise<SubmitAnswerResponse> {
    try {
      const response = await fetch(`${this.API_URL}/rooms/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roomCode, playerId, answer, responseTime }),
      });

      const data: SubmitAnswerResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Error al enviar la respuesta');
      }

      return data;
    } catch (error) {
      console.error('Error submitting answer:', error);
      return {
        success: false,
        room: {} as MultiplayerRoom,
        currentQuestion: null,
        isFinished: false,
        message: error instanceof Error ? error.message : 'Error de conexión',
      };
    }
  }

  /**
   * Obtener el estado de una sala
   */
  async getRoom(roomCode: string): Promise<{ success: boolean; room?: MultiplayerRoom; message?: string }> {
    try {
      const response = await fetch(`${this.API_URL}/rooms/${roomCode}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting room:', error);
      return {
        success: false,
        message: 'Error de conexión',
      };
    }
  }

  /**
   * Obtener el ranking de una sala
   */
  async getRanking(roomCode: string): Promise<RankingResponse> {
    try {
      const response = await fetch(`${this.API_URL}/rooms/${roomCode}/ranking`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data: RankingResponse = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting ranking:', error);
      return {
        success: false,
        ranking: [],
      };
    }
  }

  /**
   * Salir de una sala
   */
  async leaveRoom(roomCode: string, playerId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${this.API_URL}/rooms/${roomCode}/leave/${playerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error leaving room:', error);
      return {
        success: false,
        message: 'Error de conexión',
      };
    }
  }
}

export default MultiplayerService;
