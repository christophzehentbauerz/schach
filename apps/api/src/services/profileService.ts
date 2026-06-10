import type { GameReport, MoveAnalysis, TrainingRecommendation } from '@chess-mentor-ai/shared';
import { prisma } from '../db.js';

export class ProfileService {
  async updateAfterGame(userId: string, analyses: MoveAnalysis[], report: GameReport) {
    const tacticalWeaknesses = analyses.flatMap((a) => a.quality === 'blunder' || a.quality === 'mistake' ? a.motifs : []);
    return prisma.learnerProfile.upsert({
      where: { userId },
      create: {
        userId,
        estimatedElo: Math.max(600, Math.round(800 + report.accuracy * 8)),
        accuracyTrend: [report.accuracy],
        eloTrend: [Math.max(600, Math.round(800 + report.accuracy * 8))],
        tacticalWeaknesses
      },
      update: {
        estimatedElo: Math.max(600, Math.round(800 + report.accuracy * 8)),
        accuracyTrend: { push: report.accuracy },
        eloTrend: { push: Math.max(600, Math.round(800 + report.accuracy * 8)) },
        tacticalWeaknesses: { set: [...new Set(tacticalWeaknesses)].slice(0, 12) }
      }
    });
  }

  recommendations(profile?: { tacticalWeaknesses: string[]; strategicWeaknesses: string[] } | null): TrainingRecommendation[] {
    const tactical = profile?.tacticalWeaknesses?.[0] ?? 'fork';
    return [
      { area: 'tactics', priority: 1, title: `Taktikmotiv: ${tactical}`, description: 'Trainiere das Muster, das in deinen Partien am häufigsten übersehen wurde.', drills: ['10 Puzzle mit Zeitlimit', 'Motiv erklären', 'Fehlerstellung erneut lösen'] },
      { area: 'endgame', priority: 2, title: 'Aktive Königsführung', description: 'Verbessere technische Endspiele durch klare Pläne.', drills: ['König und Bauer', 'Turmaktivität', 'Opposition'] },
      { area: 'opening', priority: 3, title: 'Eröffnungspläne statt Varianten', description: 'Lerne typische Pläne deiner häufigsten Eröffnungen.', drills: ['Modellpartie ansehen', '3 typische Fehler nennen'] }
    ];
  }
}
