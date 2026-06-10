import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config.js';
import authRoutes from './routes/auth.js';
import coachRoutes from './routes/coach.js';
import gameRoutes from './routes/games.js';
import { passport } from './auth/google.js';

const app = express();
app.use(helmet());
app.use(cors({ origin: env.WEB_ORIGIN, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));
app.use(passport.initialize());

app.get('/health', (_req, res) => res.json({ ok: true, name: 'Chess Mentor AI API' }));
app.use('/auth', authRoutes);
app.use('/coach', coachRoutes);
app.use('/games', gameRoutes);

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error);
  res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
});

app.listen(env.PORT, () => {
  console.log(`Chess Mentor AI API listening on ${env.PORT}`);
});
