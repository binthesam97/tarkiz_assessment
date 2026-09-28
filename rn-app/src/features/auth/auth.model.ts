export type Role = 'ADMIN' | 'HR' | 'EMPLOYEE';

export interface SessionUser {
  sub: string;
  name: string;
  email: string;
  roles: Role[];
  employeeId: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Epoch milliseconds. */
  expiresAt: number;
  user: SessionUser;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
}

export const toSession = (response: TokenResponse): Session => ({
  accessToken: response.accessToken,
  refreshToken: response.refreshToken,
  expiresAt: Date.now() + response.expiresIn * 1000,
  user: response.user,
});
