import OpenAI from 'openai';
import { randomUUID } from 'node:crypto';
import type { CoachLanguage, HintResponse, MoveAnalysis, SkillLevel } from '@chess-mentor-ai/shared';
import { levelGuidance } from '@chess-mentor-ai/shared';
import { env } from '../config.js';

const client = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : undefined;

function fallbackExplanation(analysis: MoveAnalysis, level: SkillLevel, language: CoachLanguage) {
  const best = analysis.bestLines[0];
  const motifs = analysis.motifs.length ? analysis.motifs.join(', ') : language === 'de' ? 'keine unmittelbaren Taktiken' : 'no immediate tactics';
  if (language === 'de') {
    return `Dieser Zug wird als ${analysis.quality} bewertet. Statt nur ${best?.san ?? best?.move ?? 'einen Enginezug'} zu nennen, solltest du fragen: Welche Figur wird verbessert, welche Zentrumfelder werden kontrolliert und wird dein König sicherer? Aktuelle Motive: ${motifs}. Für dein Niveau (${level}) konzentrieren wir uns zuerst auf Plan, Drohung und schlechteste Figur.`;
  }
  return `This move is evaluated as ${analysis.quality}. Instead of only naming ${best?.san ?? best?.move ?? 'an engine move'}, ask what piece improves, which central squares are controlled, and whether king safety improves. Current motifs: ${motifs}. At your level (${level}), focus first on plan, threat, and worst-placed piece.`;
}

export class CoachService {
  async explainMove(analysis: MoveAnalysis, level: SkillLevel, language: CoachLanguage): Promise<MoveAnalysis> {
    const system = [
      'You are Chess Mentor AI, a patient professional chess coach.',
      'Never answer with only the best move. Teach the user to think independently.',
      'Explain plans, threats, controlled squares, weaknesses, tactical motifs, and alternatives.',
      ...levelGuidance[level]
    ].join('\n');

    if (!client) {
      return {
        ...analysis,
        explanation: fallbackExplanation(analysis, level, language),
        question: {
          id: randomUUID(),
          question: language === 'de' ? 'Was ist die konkrete Drohung des Gegners?' : "What is the opponent's concrete threat?",
          expectedIdeas: ['threat', 'king safety', 'loose piece']
        }
      };
    }

    const response = await client.responses.create({
      model: env.OPENAI_MODEL,
      instructions: system,
      input: JSON.stringify({ language, level, analysis })
    });

    return {
      ...analysis,
      explanation: response.output_text,
      question: {
        id: randomUUID(),
        question: language === 'de' ? 'Welche Figur ist momentan am schlechtesten entwickelt?' : 'Which piece is currently worst developed?',
        expectedIdeas: ['development', 'piece activity']
      }
    };
  }

  async hint(analysis: MoveAnalysis, level: 1 | 2 | 3 | 4, language: CoachLanguage): Promise<HintResponse> {
    const best = analysis.bestLines[0];
    const candidates = analysis.bestLines.map((line) => line.san ?? line.move);
    const hints = language === 'de'
      ? [
        'Achte zuerst auf die Aktivität deiner Figuren und die gegnerische Drohung.',
        'Suche nach einer schlecht gedeckten Figur oder einem schwachen Feld in der gegnerischen Stellung.',
        `Betrachte diese Kandidatenzüge: ${candidates.join(', ')}.`,
        `Der stärkste Zug ist ${best?.san ?? best?.move}. Er verbessert deine Stellung, weil er konkrete Drohungen mit langfristigem Plan verbindet.`
      ]
      : [
        'First notice your piece activity and the opponent threat.',
        'Look for a loose piece or weak square in the opponent position.',
        `Consider these candidate moves: ${candidates.join(', ')}.`,
        `The strongest move is ${best?.san ?? best?.move}. It improves your position by connecting a concrete threat with a long-term plan.`
      ];
    return { level, hint: hints[level - 1], candidateMoves: level >= 3 ? candidates : undefined, bestMove: level === 4 ? best?.san ?? best?.move : undefined };
  }
}
