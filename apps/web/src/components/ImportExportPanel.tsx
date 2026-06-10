import { useState } from 'react';

export function ImportExportPanel({ fen, pgn, onFen, onPgn }: { fen: string; pgn: string; onFen: (fen: string) => void; onPgn: (pgn: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <section className="glass rounded-3xl p-4">
      <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">PGN / FEN</h2>
      <textarea className="h-24 w-full rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" value={value} onChange={(event) => setValue(event.target.value)} placeholder="PGN oder FEN einfügen" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={() => onFen(value)}>FEN importieren</button>
        <button className="btn-secondary" onClick={() => onPgn(value)}>PGN importieren</button>
        <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(fen)}>FEN exportieren</button>
        <button className="btn-secondary" onClick={() => navigator.clipboard.writeText(pgn)}>PGN exportieren</button>
      </div>
      <p className="mt-2 break-all text-xs text-slate-500">Aktuelle FEN: {fen}</p>
    </section>
  );
}
