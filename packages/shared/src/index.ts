export const skillLevels = ['beginner', 'intermediate', 'club', 'expert'] as const;
export type SkillLevel = (typeof skillLevels)[number];

export const moveQualities = [
  'brilliant',
  'strong',
  'good',
  'interesting',
  'inaccuracy',
  'mistake',
  'blunder'
] as const;
export type MoveQuality = (typeof moveQualities)[number];

export type CoachLanguage = 'de' | 'en';

export interface EngineLine {
  move: string;
  san?: string;
  evaluation: number;
  depth: number;
  pv: string[];
  winProbability: number;
}

export interface MoveAnalysis {
  fen: string;
  playedMove?: string;
  quality: MoveQuality;
  evaluation: number;
  winProbability: number;
  bestLines: EngineLine[];
  motifs: TacticalMotif[];
  explanation: string;
  question?: CoachQuestion;
}

export type TacticalMotif =
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'double_attack'
  | 'mating_net'
  | 'discovered_check'
  | 'deflection'
  | 'overload'
  | 'zwischenzug'
  | 'sacrifice';

export interface CoachQuestion {
  id: string;
  question: string;
  expectedIdeas: string[];
}

export interface HintResponse {
  level: 1 | 2 | 3 | 4;
  hint: string;
  candidateMoves?: string[];
  bestMove?: string;
}

export interface OpeningInfo {
  eco: string;
  name: string;
  moves: string[];
  plans: string[];
  commonMistakes: string[];
  modelGames: string[];
  statistics: {
    whiteWin: number;
    draw: number;
    blackWin: number;
  };
}

export interface GameReport {
  summary: string;
  overallScore: number;
  accuracy: number;
  mistakeCount: number;
  blunderCount: number;
  criticalMoments: MoveAnalysis[];
  opening: string;
  middlegame: string;
  endgame: string;
  recommendations: TrainingRecommendation[];
}

export interface TrainingRecommendation {
  area: 'tactics' | 'strategy' | 'opening' | 'endgame';
  priority: number;
  title: string;
  description: string;
  drills: string[];
}

export const levelGuidance: Record<SkillLevel, string[]> = {
  beginner: ['Use simple language', 'Explain development, center control, and king safety', 'Ask one concrete question at a time'],
  intermediate: ['Discuss strategic plans', 'Explain pawn structures, initiative, space, and piece activity'],
  club: ['Include deeper variations', 'Analyze positional weaknesses and practical endgame plans'],
  expert: ['Use master-level concepts', 'Compare candidate plans and include deeper engine lines where useful']
};

export const copy = {
  de: {
    appName: 'Chess Mentor AI',
    help: 'Hilfe',
    flip: 'Brett drehen',
    importPgn: 'PGN importieren',
    exportPgn: 'PGN exportieren',
    importFen: 'FEN importieren',
    exportFen: 'FEN exportieren',
    analysis: 'Analyse',
    coach: 'Trainer',
    light: 'Hell',
    dark: 'Dunkel'
  },
  en: {
    appName: 'Chess Mentor AI',
    help: 'Help',
    flip: 'Flip board',
    importPgn: 'Import PGN',
    exportPgn: 'Export PGN',
    importFen: 'Import FEN',
    exportFen: 'Export FEN',
    analysis: 'Analysis',
    coach: 'Coach',
    light: 'Light',
    dark: 'Dark'
  }
} as const;
