export interface StockfishResult {
  bestMove: string;
  evaluation: number;
  depth: number;
  pv: string[];
}

export class StockfishClient {
  private worker?: Worker;

  async analyze(fen: string, depth = 14): Promise<StockfishResult> {
    if (typeof Worker === 'undefined') {
      return { bestMove: 'Nf3', evaluation: 20, depth, pv: ['Nf3', 'd5', 'd4'] };
    }
    if (!this.worker) {
      this.worker = new Worker('/stockfish/stockfish.js');
    }
    return new Promise((resolve) => {
      let bestMove = 'Nf3';
      let evaluation = 0;
      let pv: string[] = [];
      const timeout = window.setTimeout(() => resolve({ bestMove, evaluation, depth, pv }), 1800);
      this.worker!.onmessage = (event) => {
        const line = String(event.data);
        if (line.includes('score cp')) evaluation = Number(line.match(/score cp (-?\d+)/)?.[1] ?? 0);
        if (line.includes(' pv ')) pv = line.split(' pv ')[1].split(' ');
        if (line.startsWith('bestmove')) {
          window.clearTimeout(timeout);
          bestMove = line.split(' ')[1];
          resolve({ bestMove, evaluation, depth, pv });
        }
      };
      this.worker!.postMessage('uci');
      this.worker!.postMessage(`position fen ${fen}`);
      this.worker!.postMessage(`go depth ${depth}`);
    });
  }
}
