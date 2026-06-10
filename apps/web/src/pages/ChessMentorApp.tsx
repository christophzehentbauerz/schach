import { useEffect, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import type { HintResponse, MoveAnalysis } from '@chess-mentor-ai/shared';
import { api } from '../lib/api';
import { useApp } from '../contexts/AppContext';
import { useChessGame } from '../hooks/useChessGame';
import { TopBar } from '../components/TopBar';
import { GameClock } from '../components/GameClock';
import { MoveList } from '../components/MoveList';
import { CoachPanel } from '../components/CoachPanel';
import { ImportExportPanel } from '../components/ImportExportPanel';
import { LearningProfile } from '../components/LearningProfile';
import { OpeningCoach } from '../components/OpeningCoach';

export function ChessMentorApp() {
  const { dark, level, language } = useApp();
  const game = useChessGame();
  const [flipped, setFlipped] = useState(false);
  const [analysis, setAnalysis] = useState<MoveAnalysis>();
  const [hint, setHint] = useState<HintResponse>();
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState<any>();

  async function analyze(playedMove?: string) {
    setLoading(true);
    try {
      const result = await api.analyze(game.fen, playedMove, level, language);
      setAnalysis(result);
    } finally {
      setLoading(false);
    }
  }

  async function requestHint() {
    const next = Math.min(4, hintLevel) as 1 | 2 | 3 | 4;
    const result = await api.hint(game.fen, next, level, language);
    setHint(result);
    setHintLevel((Math.min(4, next + 1) as 1 | 2 | 3 | 4));
  }

  useEffect(() => {
    api.opening(game.history.map((move) => move.san)).then(setOpening).catch(() => undefined);
  }, [game.history]);

  return (
    <main className={dark ? 'dark' : ''}>
      <div className="min-h-screen bg-gradient-to-br from-slate-100 via-mentor-50 to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-mentor-950 dark:text-white">
        <TopBar />
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 xl:grid-cols-[minmax(320px,680px)_1fr]">
          <section className="space-y-4">
            <GameClock activeColor={game.chess.turn()} />
            <div className="glass rounded-3xl p-3">
              <Chessboard
                id="mentor-board"
                position={game.fen}
                boardOrientation={flipped ? 'black' : 'white'}
                arePiecesDraggable
                onPieceDrop={(source, target) => {
                  const move = game.move(source, target);
                  if (move) {
                    setHint(undefined);
                    setHintLevel(1);
                    window.setTimeout(() => analyze(move.san), 0);
                    return true;
                  }
                  return false;
                }}
                customBoardStyle={{ borderRadius: 24, boxShadow: '0 20px 80px rgba(15,23,42,.25)' }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => setFlipped(!flipped)}>Brett drehen</button>
              <button className="btn-secondary" onClick={() => analyze()}>Analysebrett aktualisieren</button>
              <button className="btn-secondary" onClick={game.reset}>Neue Partie</button>
            </div>
            <ImportExportPanel fen={game.fen} pgn={game.pgn} onFen={game.loadFen} onPgn={game.loadPgn} />
          </section>
          <section className="space-y-4">
            <CoachPanel analysis={analysis} hint={hint} onHint={requestHint} loading={loading} />
            <OpeningCoach opening={opening} />
            <MoveList history={game.history} />
            <LearningProfile />
          </section>
        </div>
      </div>
    </main>
  );
}
