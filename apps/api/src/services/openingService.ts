import type { OpeningInfo } from '@chess-mentor-ai/shared';

const openings: OpeningInfo[] = [
  {
    eco: 'C50',
    name: 'Italienische Partie / Italian Game',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    plans: ['Schnelle Entwicklung', 'Druck gegen f7', 'Kurze Rochade vorbereiten'],
    commonMistakes: ['Zu frühe Damenangriffe', 'König im Zentrum lassen'],
    modelGames: ['Greco - NN, 1620', 'Carlsen - Anand, Stavanger 2013'],
    statistics: { whiteWin: 38, draw: 34, blackWin: 28 }
  },
  {
    eco: 'B20',
    name: 'Sizilianische Verteidigung / Sicilian Defense',
    moves: ['e4', 'c5'],
    plans: ['Asymmetrisches Gegenspiel', 'Druck auf die halboffene c-Linie', 'Zentrum mit d5 oder e6 herausfordern'],
    commonMistakes: ['Entwicklung vernachlässigen', 'Schwache dunkle Felder zulassen'],
    modelGames: ['Kasparov - Topalov, Wijk aan Zee 1999'],
    statistics: { whiteWin: 35, draw: 31, blackWin: 34 }
  },
  {
    eco: 'D06',
    name: 'Damengambit / Queen\'s Gambit',
    moves: ['d4', 'd5', 'c4'],
    plans: ['Zentrumsspannung aufbauen', 'Minoritätsangriff verstehen', 'c-Linie nutzen'],
    commonMistakes: ['Den c-Bauern dauerhaft festhalten wollen', 'Läufer c8 einschließen'],
    modelGames: ['Capablanca - Alekhine, Buenos Aires 1927'],
    statistics: { whiteWin: 37, draw: 39, blackWin: 24 }
  },
  {
    eco: 'B12',
    name: 'Caro-Kann Verteidigung / Caro-Kann Defense',
    moves: ['e4', 'c6'],
    plans: ['Solide Bauernstruktur', 'Läufer f5 vor e6 entwickeln', 'Endspielstärke nutzen'],
    commonMistakes: ['Zu passiv bleiben', 'Den weißfeldrigen Läufer einsperren'],
    modelGames: ['Karpov - Kasparov, Linares 1993'],
    statistics: { whiteWin: 33, draw: 37, blackWin: 30 }
  }
];

export class OpeningService {
  identify(sanMoves: string[]): OpeningInfo | undefined {
    return openings
      .filter((opening) => opening.moves.every((move, index) => sanMoves[index] === move))
      .sort((a, b) => b.moves.length - a.moves.length)[0];
  }

  all() {
    return openings;
  }
}
