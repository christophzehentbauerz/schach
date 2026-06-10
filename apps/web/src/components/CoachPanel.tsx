import { motion } from 'framer-motion';
import type { HintResponse, MoveAnalysis } from '@chess-mentor-ai/shared';

export function CoachPanel({ analysis, hint, onHint, loading }: { analysis?: MoveAnalysis; hint?: HintResponse; onHint: () => void; loading: boolean }) {
  return (
    <section className="glass rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-white">KI-Schachtrainer</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">Sokratische Hinweise statt sofortiger Engine-Antwort.</p>
        </div>
        <button className="btn-primary" onClick={onHint}>Hilfe</button>
      </div>
      {loading && <p className="animate-pulse text-mentor-500">Analysiere Stellung und formuliere Trainerfeedback…</p>}
      {analysis && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><b>{analysis.quality}</b><br />Bewertung</div>
            <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><b>{analysis.evaluation}</b><br />Engine</div>
            <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800"><b>{analysis.winProbability}%</b><br />Gewinn</div>
          </div>
          <p className="leading-7 text-slate-800 dark:text-slate-100">{analysis.explanation}</p>
          {analysis.question && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
              <b>Trainerfrage:</b> {analysis.question.question}
              <input className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2 text-slate-900" placeholder="Deine Antwort…" />
            </div>
          )}
          <div>
            <h3 className="font-bold">Beste Kandidaten</h3>
            <div className="mt-2 space-y-2">
              {analysis.bestLines.map((line, index) => (
                <div key={line.move} className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-800">
                  {index + 1}. <b>{line.san ?? line.move}</b> · Eval {line.evaluation} · Gewinn {line.winProbability}%
                  <div className="text-xs text-slate-500">PV: {line.pv.join(' ')}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
      {hint && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 rounded-2xl bg-mentor-50 p-4 text-mentor-950 dark:bg-mentor-950 dark:text-mentor-50">
          <b>Hinweis Stufe {hint.level}:</b> {hint.hint}
        </motion.div>
      )}
    </section>
  );
}
