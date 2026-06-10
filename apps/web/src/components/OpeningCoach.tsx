export function OpeningCoach({ opening }: { opening: any }) {
  return (
    <section className="glass rounded-3xl p-4">
      <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">Eröffnungscoach</h2>
      {opening ? (
        <div className="space-y-2 text-sm">
          <p><b>{opening.name}</b> ({opening.eco})</p>
          <p><b>Pläne:</b> {opening.plans.join(' · ')}</p>
          <p><b>Typische Fehler:</b> {opening.commonMistakes.join(' · ')}</p>
          <p><b>Statistik:</b> Weiß {opening.statistics.whiteWin}% · Remis {opening.statistics.draw}% · Schwarz {opening.statistics.blackWin}%</p>
        </div>
      ) : <p className="text-sm text-slate-500">Noch keine bekannte Eröffnung erkannt.</p>}
    </section>
  );
}
