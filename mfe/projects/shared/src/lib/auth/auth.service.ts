import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, finalize, map, shareReplay, tap } from 'rxjs';
import { API_BASE_URL } from '../config/api-config';
import { LoginResponse, Role, Session } from './auth.models';

const STORAGE_KEY = 'acme.session';

/**
 * Single source of truth for the signed-in user.
 *
 * Shared through Native Federation as a singleton, so the host and every
 * remote loaded into it observe the same session instance. The session is
 * persisted to localStorage and synchronised across browser tabs.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  // HttpBackend bypasses interceptors, avoiding a cycle with the auth interceptor.
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly apiUrl = inject(API_BASE_URL);

  private readonly session = signal<Session | null>(readSession());
  private refreshInFlight: Observable<Session> | null = null;

  readonly user = computed(() => this.session()?.user ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);

  constructor() {
    window.addEventListener('storage', (event) => {
      if (event.key === STORAGE_KEY) this.session.set(readSession());
    });
  }

  get accessToken(): string | null {
    return this.session()?.accessToken ?? null;
  }

  hasAnyRole(roles: readonly Role[]): boolean {
    const userRoles = this.user()?.roles ?? [];
    return roles.length === 0 || roles.some((role) => userRoles.includes(role));
  }

  login(email: string, password: string): Observable<Session> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(map(toSession), tap((session) => this.store(session)));
  }

  /** Concurrent callers share one refresh request. */
  refresh(): Observable<Session> {
    const refreshToken = this.session()?.refreshToken;
    if (!refreshToken) throw new Error('No active session to refresh');
    this.refreshInFlight ??= this.http.post<LoginResponse>(`${this.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      map(toSession),
      tap({ next: (session) => this.store(session), error: () => this.logout() }),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay(1),
    );
    return this.refreshInFlight;
  }

  logout(): void {
    this.session.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private store(session: Session): void {
    this.session.set(session);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }
}

function toSession(response: LoginResponse): Session {
  return {
    accessToken: response.accessToken,
    refreshToken: response.refreshToken,
    expiresAt: Date.now() + response.expiresIn * 1000,
    user: response.user,
  };
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
