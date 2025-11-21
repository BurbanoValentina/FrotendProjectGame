import { UserHashMap, SessionQueue, NavigationStack } from '../lib/UserDataStructures';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'https://web-k1y5lmjwwpdm.up-de-fra1-k8s-1.apps.run-on-seenode.com';
const AUTH_ENDPOINT = `${API_BASE_URL}/api/auth`;

export interface User {
  id: string;
  username: string;
  nickname: string;
  highScore: number;
}

export interface SessionInfo {
  sessionId: string;
  token: string;
  expiresAt: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: User;
  session?: SessionInfo;
}

export interface PasswordChangeResponse {
  success: boolean;
  message: string;
}

interface StoredAuthPayload {
  user: User;
  session?: SessionInfo | null;
}

// Singleton Pattern para AuthService
class AuthService {
  private static instance: AuthService;
  private static readonly STORAGE_KEY = 'currentUser';
  private userCache: UserHashMap;
  private sessionHistory: SessionQueue<string>;
  private navigationHistory: NavigationStack<string>;
  private currentUser: User | null;
  private activeSession: SessionInfo | null;
  private readonly authEndpoint = AUTH_ENDPOINT;

  private constructor() {
    this.userCache = new UserHashMap();
    this.sessionHistory = new SessionQueue<string>(20);
    this.navigationHistory = new NavigationStack<string>();

    const storedPayload = this.loadAuthPayload();
    this.currentUser = storedPayload?.user ?? null;
    this.activeSession = storedPayload?.session ?? null;

    if (this.currentUser?.username) {
      this.userCache.set(this.currentUser.username, this.currentUser);
    }
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
      const payload = {
        username: username.trim(),
        password: password.trim(),
        nickname: nickname.trim(),
      };
      const response = await fetch(`${this.authEndpoint}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.user) {
        this.setAuthenticationState(data.user, data.session ?? null);
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
      const payload = {
        username: username.trim(),
        password: password.trim(),
      };
      const response = await fetch(`${this.authEndpoint}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: AuthResponse = await response.json();

      if (data.success && data.user) {
        this.setAuthenticationState(data.user, data.session ?? null);
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

  async changePassword(identifier: string, newPassword: string): Promise<PasswordChangeResponse> {
    try {
      const response = await fetch(`${this.authEndpoint}/password/change`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, newPassword }),
      });

      const message = await response.text();
      if (!response.ok) {
        return {
          success: false,
          message: message || 'No pudimos actualizar la contraseña.',
        };
      }

      return {
        success: true,
        message: message || 'Contraseña actualizada correctamente.',
      };
    } catch (error) {
      return {
        success: false,
        message:
          'No pudimos contactar al servidor. Intenta nuevamente en unos segundos o escribe a soporte@gamechallenge.com',
      };
    }
  }

  // Cerrar sesión
  logout(): void {
    if (this.currentUser) {
      this.sessionHistory.enqueue(`Usuario ${this.currentUser.username} cerró sesión - ${new Date().toLocaleString()}`);
    }

    const token = this.activeSession?.token;
    this.clearAuthenticationState();

    if (token) {
      void this.revokeRemoteSession(token);
    }
  }

  // Actualizar high score
  async updateHighScore(userId: string, score: number): Promise<boolean> {
    try {
      const response = await fetch(`${this.authEndpoint}/user/${userId}/highscore?score=${score}`, {
        method: 'PUT',
      });

      if (response.ok && this.currentUser) {
        this.currentUser.highScore = score;
        this.saveAuthPayload();
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
    this.enforceSessionTtl();
    return this.currentUser;
  }

  private setAuthenticationState(user: User, session?: SessionInfo | null): void {
    this.currentUser = user;
    this.activeSession = session ?? null;
    this.saveAuthPayload();
  }

  private clearAuthenticationState(): void {
    this.currentUser = null;
    this.activeSession = null;
    localStorage.removeItem(AuthService.STORAGE_KEY);
    this.navigationHistory.clear();
  }

  private saveAuthPayload(): void {
    if (!this.currentUser) {
      this.clearAuthenticationState();
      return;
    }

    const payload: StoredAuthPayload = {
      user: this.currentUser,
      session: this.activeSession,
    };
    localStorage.setItem(AuthService.STORAGE_KEY, JSON.stringify(payload));
  }

  private loadAuthPayload(): StoredAuthPayload | null {
    const stored = localStorage.getItem(AuthService.STORAGE_KEY);
    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored) as StoredAuthPayload | User | null;
      if (parsed && typeof parsed === 'object' && 'user' in parsed) {
        const payload = parsed as StoredAuthPayload;
        return {
          user: payload.user,
          session: payload.session ?? null,
        };
      }
      return parsed ? { user: parsed as User, session: null } : null;
    } catch (error) {
      return null;
    }
  }

  // Obtener historial de sesiones
  getSessionHistory(): string[] {
    return this.sessionHistory.toArray();
  }

  // Verificar si hay usuario autenticado
  isAuthenticated(): boolean {
    this.enforceSessionTtl();
    return this.currentUser !== null;
  }

  // Obtener usuario del caché
  getCachedUser(username: string): User | null {
    return this.userCache.get(username);
  }

  private enforceSessionTtl(): void {
    if (!this.activeSession?.expiresAt) {
      return;
    }

    const expiresAt = new Date(this.activeSession.expiresAt).getTime();
    if (Number.isNaN(expiresAt) || Date.now() >= expiresAt) {
      this.logout();
    }
  }

  private async revokeRemoteSession(token: string): Promise<void> {
    try {
      await fetch(`${this.authEndpoint}/logout?token=${encodeURIComponent(token)}`, {
        method: 'POST',
      });
    } catch (error) {
      console.warn('Unable to notify backend about logout', error);
    }
  }
}

export default AuthService;
