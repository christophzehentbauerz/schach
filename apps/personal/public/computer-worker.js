import { chooseComputerMove } from './computer.js';
self.onmessage=({data})=>{
  try{self.postMessage({...chooseComputerMove(data.fen,data.elo),generation:data.generation,fen:data.fen});}
  catch(error){self.postMessage({error:String(error),generation:data.generation,fen:data.fen});}
};
