import { Router } from 'express';
import { z } from 'zod';
import { skillLevels } from '@chess-mentor-ai/shared';
import { AnalysisService } from '../services/analysisService.js';
import { CoachService } from '../services/coachService.js';
import { OpeningService } from '../services/openingService.js';

const router = Router();
const analysis = new AnalysisService();
const coach = new CoachService();
const openings = new OpeningService();

const AnalyzeBody = z.object({
  fen: z.string(),
  playedMove: z.string().optional(),
  level: z.enum(skillLevels).default('beginner'),
  language: z.enum(['de', 'en']).default('de')
});

router.post('/analyze', async (req, res) => {
  const input = AnalyzeBody.parse(req.body);
  const engine = await analysis.analyzePosition(input.fen, input.playedMove);
  const coached = await coach.explainMove(engine, input.level, input.language);
  res.json(coached);
});

router.post('/hint', async (req, res) => {
  const input = AnalyzeBody.extend({ hintLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]) }).parse(req.body);
  const engine = await analysis.analyzePosition(input.fen, input.playedMove);
  res.json(await coach.hint(engine, input.hintLevel, input.language));
});

router.post('/opening', (req, res) => {
  const { moves } = z.object({ moves: z.array(z.string()) }).parse(req.body);
  res.json(openings.identify(moves) ?? null);
});

router.get('/openings', (_req, res) => res.json(openings.all()));

export default router;
