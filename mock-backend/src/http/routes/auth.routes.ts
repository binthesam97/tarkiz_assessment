import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config.js';
import { db } from '../../data/db.js';
import type { User } from '../../data/models.js';
import { authenticate, type AccessTokenClaims } from '../middleware/auth.js';
import { requireFields } from '../middleware/errors.js';

export const authRoutes = Router();

function issueTokens(user: User) {
  const claims: AccessTokenClaims = {
    sub: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    employeeId: user.employeeId,
  };
  return {
    accessToken: jwt.sign(claims, config.jwt.secret, { expiresIn: config.jwt.accessTokenTtlSeconds }),
    refreshToken: jwt.sign({ sub: user.id, type: 'refresh' }, config.jwt.secret, {
      expiresIn: config.jwt.refreshTokenTtlSeconds,
    }),
    expiresIn: config.jwt.accessTokenTtlSeconds,
    user: claims,
  };
}

authRoutes.post('/login', (req, res) => {
  const { email, password } = requireFields<{ email: string; password: string }>(req.body, ['email', 'password']);
  const user = db.users.find((candidate) => candidate.email === email.toLowerCase() && candidate.password === password);
  if (!user) {
    res.status(401).json({ message: 'Invalid email or password' });
    return;
  }
  res.json(issueTokens(user));
});

authRoutes.post('/refresh', (req, res) => {
  const { refreshToken } = requireFields<{ refreshToken: string }>(req.body, ['refreshToken']);
  try {
    const payload = jwt.verify(refreshToken, config.jwt.secret) as { sub: string; type?: string };
    const user = db.users.find((candidate) => candidate.id === payload.sub);
    if (payload.type !== 'refresh' || !user) throw new Error('Invalid refresh token');
    res.json(issueTokens(user));
  } catch {
    res.status(401).json({ message: 'Refresh token is invalid or expired' });
  }
});

authRoutes.get('/me', authenticate, (req, res) => {
  res.json(req.user);
});
