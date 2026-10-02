export class Stockfish {
  constructor(workerFactory=url=>new Worker(url)){
    this.worker=workerFactory(new URL('./vendor/stockfish/stockfish-17.1-lite-single-03e3232.js',import.meta.url));
    this.current=null;this.closed=false;
    this.ready=new Promise((resolve,reject)=>{this.readyResolve=resolve;this.readyReject=reject;});
    this.ready.catch(()=>{});
    this.bootTimer=setTimeout(()=>this.fail(new Error('Stockfish konnte nicht geladen werden. Bitte erneut versuchen.')),30000);
    this.worker.onmessage=({data})=>String(data).split('\n').forEach(line=>this.line(line));
    this.worker.onerror=()=>this.fail(new Error('Stockfish ist in diesem Browser gerade nicht verfügbar.'));
    this.worker.onmessageerror=()=>this.fail(new Error('Die Engine-Antwort konnte nicht gelesen werden.'));
    this.send('uci');
  }
  send(command){if(!this.closed)this.worker.postMessage(command);}
  line(line){
    if(this.closed)return;
    if(line==='uciok'){this.send('setoption name Hash value 8');this.send('setoption name Threads value 1');this.send('isready');return;}
    if(line==='readyok'){clearTimeout(this.bootTimer);this.readyResolve();return;}
    const cur=this.current;if(!cur)return;
    if(line.startsWith('info ')&&/\bscore (cp|mate) /.test(line)&&!line.includes('upperbound')&&!line.includes('lowerbound')){
      const score=line.match(/\bscore (cp|mate) (-?\d+)/),depth=line.match(/\bdepth (\d+)/),pv=line.match(/\bpv (.*)/);
      if(score&&pv)cur.info={kind:score[1],value:Number(score[2]),depth:Number(depth?.[1]||0),pv:pv[1].trim().split(/\s+/)};
    }
    if(line.startsWith('bestmove ')){
      clearTimeout(cur.timer);this.current=null;
      const bestmove=line.split(' ')[1];
      if(!cur.info){cur.reject(new Error('Für diese Stellung liegt noch keine Bewertung vor.'));return;}
      cur.resolve({...cur.info,bestmove});
    }
  }
  async search(fen,milliseconds=300,rootMove=null){
    await this.ready;if(this.closed)throw new Error('Analyse beendet');if(this.current)throw new Error('Engine bereits beschäftigt');
    return new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>this.fail(new Error('Analyse unterbrochen. Bitte erneut versuchen.')),milliseconds+10000);
      this.current={resolve,reject,timer,info:null};
      this.send('position fen '+fen);
      this.send('go movetime '+milliseconds+(rootMove?' searchmoves '+rootMove:''));
    });
  }
  fail(error){this.readyReject?.(error);this.current?.reject(error);this.dispose();}
  dispose(){if(this.closed)return;this.closed=true;clearTimeout(this.bootTimer);if(this.current){clearTimeout(this.current.timer);this.current.reject(new Error('Analyse beendet'));this.current=null;}this.readyReject?.(new Error('Analyse beendet'));this.worker.terminate();}
}
export const uci=move=>move.from+move.to+(move.promotion||'');
export const scoreNumber=score=>score.kind==='mate'?(score.value>0?10000:-10000):score.value;
