import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../db.js';
import { verifyToken } from '../auth/jwt.js';

export interface AuthenticatedUser {
  id: string;
  email: string;
  skillLevel: string;
  locale: string;
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return res.status(401).json({ error: 'Missing bearer token' });

  try {
    const payload = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Invalid token user' });
    req.authUser = { id: user.id, email: user.email, skillLevel: user.skillLevel, locale: user.locale };
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
