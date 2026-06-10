import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const data = [
  { game: 1, elo: 900, accuracy: 62 },
  { game: 2, elo: 930, accuracy: 66 },
  { game: 3, elo: 980, accuracy: 71 },
  { game: 4, elo: 1010, accuracy: 74 }
];

export function LearningProfile() {
  return (
    <section className="glass rounded-3xl p-5">
      <h2 className="text-xl font-black text-slate-950 dark:text-white">Persönliches Lernprofil</h2>
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">Langfristige Muster: Taktik, Strategie, Eröffnung und Endspiel.</p>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="game" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="elo" stroke="#3178ff" strokeWidth={3} />
            <Line type="monotone" dataKey="accuracy" stroke="#22c55e" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><b>Stärke:</b> Entwicklung und Zentrumskontrolle</div>
        <div className="rounded-2xl bg-slate-100 p-4 dark:bg-slate-800"><b>Schwäche:</b> Springergabeln früh erkennen</div>
      </div>
    </section>
  );
}
