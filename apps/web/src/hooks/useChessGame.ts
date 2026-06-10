import { useMemo, useState } from 'react';
import { Chess, type Move } from 'chess.js';

export function useChessGame() {
  const [fen, setFen] = useState(new Chess().fen());
  const [history, setHistory] = useState<Move[]>([]);
  const chess = useMemo(() => {
    const game = new Chess();
    game.load(fen);
    return game;
  }, [fen]);

  function move(from: string, to: string, promotion = 'q') {
    const game = new Chess(fen);
    const result = game.move({ from, to, promotion });
    if (!result) return false;
    setFen(game.fen());
    setHistory(game.history({ verbose: true }));
    return result;
  }

  function loadFen(nextFen: string) {
    const game = new Chess(nextFen);
    setFen(game.fen());
    setHistory(game.history({ verbose: true }));
  }

  function loadPgn(pgn: string) {
    const game = new Chess();
    game.loadPgn(pgn);
    setFen(game.fen());
    setHistory(game.history({ verbose: true }));
  }

  function reset() {
    const game = new Chess();
    setFen(game.fen());
    setHistory([]);
  }

  return { chess, fen, history, move, loadFen, loadPgn, reset, pgn: chess.pgn() };
}
