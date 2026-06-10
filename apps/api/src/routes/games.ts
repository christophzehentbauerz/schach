import { Router } from 'express';
import { z } from 'zod';
import type { GameReport, MoveAnalysis } from '@chess-mentor-ai/shared';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { ProfileService } from '../services/profileService.js';

const router = Router();
const profiles = new ProfileService();

const SaveGame = z.object({
  pgn: z.string(),
  finalFen: z.string(),
  result: z.string().optional(),
  analyses: z.array(z.any()).default([])
});

function buildReport(analyses: MoveAnalysis[]): GameReport {
  const mistakes = analyses.filter((a) => a.quality === 'mistake').length;
  const blunders = analyses.filter((a) => a.quality === 'blunder').length;
  const accuracy = Math.max(0, Math.round(100 - mistakes * 5 - blunders * 12));
  return {
    summary: 'Deine Partie wurde nach Eröffnung, Mittelspiel und Endspiel ausgewertet. Die wichtigsten Trainingspunkte sind priorisiert.',
    overallScore: accuracy,
    accuracy,
    mistakeCount: mistakes,
    blunderCount: blunders,
    criticalMoments: analyses.filter((a) => ['mistake', 'blunder', 'brilliant'].includes(a.quality)).slice(0, 8),
    opening: 'Prüfe, ob deine ersten Züge Entwicklung, Zentrum und Königssicherheit verbinden.',
    middlegame: 'Achte auf Aktivität, ungedeckte Figuren und die gegnerische Drohung vor jedem Zug.',
    endgame: 'Aktiviere König und Türme früh und erstelle konkrete Umwandlungspläne.',
    recommendations: profiles.recommendations(null)
  };
}

router.use(requireAuth);

router.post('/', async (req, res) => {
  const input = SaveGame.parse(req.body);
  const analyses = input.analyses as MoveAnalysis[];
  const report = buildReport(analyses);
  const game = await prisma.game.create({
    data: {
      userId: req.user!.id,
      pgn: input.pgn,
      finalFen: input.finalFen,
      result: input.result,
      accuracy: report.accuracy,
      report: report as unknown as object
    }
  });
  await profiles.updateAfterGame(req.user!.id, analyses, report);
  res.status(201).json({ game, report });
});

router.get('/', async (req, res) => {
  const games = await prisma.game.findMany({ where: { userId: req.user!.id }, orderBy: { createdAt: 'desc' }, take: 50 });
  res.json(games);
});

router.get('/profile', async (req, res) => {
  const profile = await prisma.learnerProfile.findUnique({ where: { userId: req.user!.id } });
  res.json({ profile, recommendations: profiles.recommendations(profile) });
});

export default router;
