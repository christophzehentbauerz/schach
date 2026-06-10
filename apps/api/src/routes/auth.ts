import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { signToken } from '../auth/jwt.js';
import { passport } from '../auth/google.js';
import { env } from '../config.js';

const router = Router();
const Credentials = z.object({ email: z.string().email(), password: z.string().min(8), name: z.string().optional() });

router.post('/register', async (req, res) => {
  const input = Credentials.parse(req.body);
  const passwordHash = await bcrypt.hash(input.password, 12);
  const user = await prisma.user.create({ data: { email: input.email, name: input.name, passwordHash } });
  const token = signToken({ sub: user.id, email: user.email });
  res.status(201).json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

router.post('/login', async (req, res) => {
  const input = Credentials.omit({ name: true }).parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = signToken({ sub: user.id, email: user.email });
  return res.json({ token, user: { id: user.id, email: user.email, name: user.name, skillLevel: user.skillLevel, locale: user.locale } });
});


router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: `${env.WEB_ORIGIN}/login?error=google` }), (req, res) => {
  const user = req.user as { id: string; email: string };
  const token = signToken({ sub: user.id, email: user.email });
  res.redirect(`${env.WEB_ORIGIN}/auth/callback?token=${token}`);
});

export default router;

