import type { Move } from 'chess.js';

export function MoveList({ history }: { history: Move[] }) {
  const pairs = Array.from({ length: Math.ceil(history.length / 2) }, (_, index) => history.slice(index * 2, index * 2 + 2));
  return (
    <section className="glass rounded-3xl p-4">
      <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">Zugliste</h2>
      <div className="max-h-64 overflow-auto text-sm">
        {pairs.map((pair, index) => (
          <div key={index} className="grid grid-cols-[3rem_1fr_1fr] gap-2 rounded-xl px-2 py-1 odd:bg-slate-100 dark:odd:bg-slate-800">
            <span className="text-slate-500">{index + 1}.</span>
            <span>{pair[0]?.san}</span>
            <span>{pair[1]?.san}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
