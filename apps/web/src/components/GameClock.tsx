import { useEffect, useState } from 'react';

export function GameClock({ activeColor }: { activeColor: 'w' | 'b' }) {
  const [white, setWhite] = useState(600);
  const [black, setBlack] = useState(600);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (activeColor === 'w') setWhite((value) => Math.max(0, value - 1));
      else setBlack((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [activeColor]);
  const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return (
    <div className="grid grid-cols-2 gap-3 text-center">
      <div className="rounded-2xl bg-white p-3 font-mono text-xl dark:bg-slate-800">♙ {format(white)}</div>
      <div className="rounded-2xl bg-slate-900 p-3 font-mono text-xl text-white dark:bg-black">♟ {format(black)}</div>
    </div>
  );
}
