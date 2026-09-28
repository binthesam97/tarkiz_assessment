import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import type { Role } from '../../data/models.js';

export interface AccessTokenClaims {
  sub: string;
  name: string;
  email: string;
  roles: Role[];
  employeeId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AccessTokenClaims;
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const [scheme, token] = (req.header('authorization') ?? '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ message: 'Missing bearer token' });
    return;
  }
  try {
    req.user = jwt.verify(token, config.jwt.secret) as AccessTokenClaims;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function authorize(...allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user?.roles.some((role) => allowed.includes(role))) {
      res.status(403).json({ message: 'Insufficient permissions' });
      return;
    }
    next();
  };
}
