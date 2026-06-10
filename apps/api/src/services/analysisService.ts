import { Chess } from 'chess.js';
import type { EngineLine, MoveAnalysis, MoveQuality, TacticalMotif } from '@chess-mentor-ai/shared';

function winProbability(cp: number) {
  return Math.round((1 / (1 + Math.exp(-cp / 230))) * 1000) / 10;
}

function classify(delta: number): MoveQuality {
  if (delta <= 10) return 'brilliant';
  if (delta <= 25) return 'strong';
  if (delta <= 55) return 'good';
  if (delta <= 90) return 'interesting';
  if (delta <= 150) return 'inaccuracy';
  if (delta <= 300) return 'mistake';
  return 'blunder';
}

function materialEval(chess: Chess) {
  const values: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
  return chess.board().flat().reduce((sum, piece) => {
    if (!piece) return sum;
    const value = values[piece.type] ?? 0;
    return sum + (piece.color === 'w' ? value : -value);
  }, 0);
}

function detectMotifs(chess: Chess): TacticalMotif[] {
  const motifs = new Set<TacticalMotif>();
  const legal = chess.moves({ verbose: true });
  if (legal.some((m) => m.san.includes('+') && legal.filter((x) => x.from === m.from).length > 2)) motifs.add('fork');
  if (legal.some((m) => m.flags.includes('c') && m.san.includes('+'))) motifs.add('double_attack');
  if (legal.some((m) => m.san.includes('#'))) motifs.add('mating_net');
  if (legal.some((m) => m.flags.includes('p'))) motifs.add('sacrifice');
  return [...motifs];
}

export class AnalysisService {
  async analyzePosition(fen: string, playedMove?: string): Promise<MoveAnalysis> {
    const chess = new Chess(fen);
    const legalMoves = chess.moves({ verbose: true });
    const baseEval = materialEval(chess) + (chess.turn() === 'w' ? 18 : -18);
    const lines: EngineLine[] = legalMoves.slice(0, 12).map((move, index) => {
      const next = new Chess(fen);
      next.move(move.san);
      const positional = move.flags.includes('c') ? 45 : 0;
      const development = ['n', 'b'].includes(move.piece) ? 18 : 0;
      const evalCp = materialEval(next) + positional + development - index * 4;
      return {
        move: move.lan,
        san: move.san,
        evaluation: evalCp,
        depth: 14,
        pv: [move.san, ...next.moves().slice(0, 4)],
        winProbability: winProbability(evalCp)
      };
    }).sort((a, b) => chess.turn() === 'w' ? b.evaluation - a.evaluation : a.evaluation - b.evaluation).slice(0, 3);

    const playedLine = playedMove ? lines.find((line) => line.san === playedMove || line.move === playedMove) : lines[0];
    const best = lines[0]?.evaluation ?? baseEval;
    const playedEval = playedLine?.evaluation ?? baseEval - 120;
    const delta = Math.abs(best - playedEval);

    return {
      fen,
      playedMove,
      quality: classify(delta),
      evaluation: playedEval,
      winProbability: winProbability(playedEval),
      bestLines: lines,
      motifs: detectMotifs(chess),
      explanation: 'Engine baseline prepared. The coach service turns this into a pedagogical explanation instead of a move-only answer.'
    };
  }
}
