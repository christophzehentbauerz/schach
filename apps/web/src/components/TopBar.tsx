import { Moon, Sun } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function TopBar() {
  const { t, dark, setDark, language, setLanguage, level, setLevel } = useApp();
  return (
    <header className="glass sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-b-3xl px-5 py-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{t.appName}</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Personal chess trainer, analysis partner and long-term learning profile.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select className="btn-secondary" value={level} onChange={(event) => setLevel(event.target.value as typeof level)}>
          <option value="beginner">Anfänger</option>
          <option value="intermediate">Fortgeschritten</option>
          <option value="club">Vereinsspieler</option>
          <option value="expert">Experte</option>
        </select>
        <select className="btn-secondary" value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
          <option value="de">Deutsch</option>
          <option value="en">English</option>
        </select>
        <button className="btn-secondary" onClick={() => setDark(!dark)} aria-label="Toggle theme">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
