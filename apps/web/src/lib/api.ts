import type { CoachLanguage, HintResponse, MoveAnalysis, SkillLevel } from '@chess-mentor-ai/shared';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<T>;
}

export const api = {
  analyze: (fen: string, playedMove: string | undefined, level: SkillLevel, language: CoachLanguage) =>
    request<MoveAnalysis>('/coach/analyze', { method: 'POST', body: JSON.stringify({ fen, playedMove, level, language }) }),
  hint: (fen: string, hintLevel: 1 | 2 | 3 | 4, level: SkillLevel, language: CoachLanguage) =>
    request<HintResponse>('/coach/hint', { method: 'POST', body: JSON.stringify({ fen, hintLevel, level, language }) }),
  opening: (moves: string[]) => request('/coach/opening', { method: 'POST', body: JSON.stringify({ moves }) })
};
