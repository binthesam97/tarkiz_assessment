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

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: SessionUser;
}
