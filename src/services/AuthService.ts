import { UserHashMap, SessionQueue, NavigationStack } from '../lib/UserDataStructures';

export interface User {
  id: number;
  username: string;
  nickname: string;
  highScore: number;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
}

// Singleton Pattern para AuthService
class AuthService {
  private static instance: AuthService;
  private userCache: UserHashMap;
  private sessionHistory: SessionQueue<string>;
  private navigationHistory: NavigationStack<string>;
  private currentUser: User | null;
  private readonly API_URL = 'https://web-k1y5lmjwwpdm.up-de-fra1-k8s-1.apps.run-on-seenode.com/api/auth';

  private constructor() {
    this.userCache = new UserHashMap();
    this.sessionHistory = new SessionQueue<string>(20);
    this.navigationHistory = new NavigationStack<string>();
    this.currentUser = this.loadUserFromStorage();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Registrar usuario
  async register(username: string, password: string, nickname: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, nickname }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.user) {
        this.setCurrentUser(data.user);
        this.sessionHistory.enqueue(`Usuario ${username} registrado - ${new Date().toLocaleString()}`);
        this.userCache.set(username, data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con el servidor',
      };
    }
  }

  // Iniciar sesión
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.user) {
        this.setCurrentUser(data.user);
        this.sessionHistory.enqueue(`Usuario ${username} inició sesión - ${new Date().toLocaleString()}`);
        this.userCache.set(username, data.user);
      }

      return data;
    } catch (error) {
      return {
        success: false,
        message: 'Error de conexión con el servidor',
      };
    }
  }

  // Cerrar sesión
  logout(): void {
    if (this.currentUser) {
      this.sessionHistory.enqueue(`Usuario ${this.currentUser.username} cerró sesión - ${new Date().toLocaleString()}`);
    }
    this.currentUser = null;
    localStorage.removeItem('currentUser');
    this.navigationHistory.clear();
  }

  // Actualizar high score
  async updateHighScore(userId: number, score: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.API_URL}/user/${userId}/highscore?score=${score}`, {
        method: 'PUT',
      });

      if (response.ok && this.currentUser) {
        this.currentUser.highScore = score;
        this.saveUserToStorage();
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  // Navegación
  pushNavigation(page: string): void {
    this.navigationHistory.push(page);
  }

  popNavigation(): string | undefined {
    return this.navigationHistory.pop();
  }

  // Gestión de usuario actual
  getCurrentUser(): User | null {
    return this.currentUser;
  }

  private setCurrentUser(user: User): void {
    this.currentUser = user;
    this.saveUserToStorage();
  }

  private saveUserToStorage(): void {
    if (this.currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    }
  }

  private loadUserFromStorage(): User | null {
    const stored = localStorage.getItem('currentUser');
    return stored ? JSON.parse(stored) : null;
  }

  // Obtener historial de sesiones
  getSessionHistory(): string[] {
    return this.sessionHistory.toArray();
  }

  // Verificar si hay usuario autenticado
  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Obtener usuario del caché
  getCachedUser(username: string): User | null {
    return this.userCache.get(username);
  }
}

export default AuthService;
