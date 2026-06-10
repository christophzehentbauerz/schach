import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { CoachLanguage, SkillLevel } from '@chess-mentor-ai/shared';
import { copy } from '@chess-mentor-ai/shared';

interface AppContextValue {
  language: CoachLanguage;
  setLanguage: (language: CoachLanguage) => void;
  level: SkillLevel;
  setLevel: (level: SkillLevel) => void;
  dark: boolean;
  setDark: (dark: boolean) => void;
  t: typeof copy.de;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<CoachLanguage>('de');
  const [level, setLevel] = useState<SkillLevel>('beginner');
  const [dark, setDark] = useState(true);
  const value = useMemo(() => ({ language, setLanguage, level, setLevel, dark, setDark, t: copy[language] }), [language, level, dark]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
