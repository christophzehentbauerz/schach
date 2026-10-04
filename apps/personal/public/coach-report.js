import { Chess } from './vendor/chess.js';
import { linePositions, whiteScore, scoreText } from './analysis-model.js';
const names={p:'Bauer',n:'Springer',b:'Läufer',r:'Turm',q:'Dame',k:'König'};
const accusative={p:'den Bauern',n:'den Springer',b:'den Läufer',r:'den Turm',q:'die Dame',k:'den König'};
const values={p:1,n:3,b:3,r:5,q:9,k:0};
const side=color=>color==='w'?'Weiß':'Schwarz',other=color=>color==='w'?'b':'w';
const number=value=>Number(value.toFixed(2)).toLocaleString('de-AT');
const squareNames=Array.from({length:64},(_,i)=>'abcdefgh'[i%8]+(Math.floor(i/8)+1));
export function material(fen,color){return new Chess(fen).board().flat().filter(Boolean).reduce((sum,p)=>sum+(p.color===color?1:-1)*values[p.type],0);}
function pieces(game){return game.board().flat().filter(Boolean);}
function label(game,sq){const p=game.get(sq);return p?`${names[p.type]} ${sq}`:sq;}
function join(items){return items.length?items.join(', '):'keine';}
function listMoves(moves,limit=8){return moves.slice(0,limit).map(m=>m.san).join(', ')+(moves.length>limit?` und ${moves.length-limit} weitere`:'');}
function moveNumber(game){return `${game.fen().split(' ')[5]}${game.turn()==='w'?'.':'…'}`;}
function balanceText(fen,color){const net=material(fen,color);return net===0?'Das Material ist nach den üblichen Richtwerten ausgeglichen.':`${side(color)} hat rechnerisch ${number(Math.abs(net))} Materialpunkte ${net>0?'mehr':'weniger'} als ${side(other(color))}.`;}
function controls(game,from,color){return squareNames.filter(sq=>game.attackers(sq,color).includes(from));}
function pawnStructure(game,color){
 const pawns=pieces(game).filter(p=>p.type==='p'&&p.color===color),files=pawns.map(p=>p.square[0]);
 return {doubled:[...new Set(files.filter((f,i)=>files.indexOf(f)!==i))],isolated:pawns.filter(p=>{const f=p.square.charCodeAt(0);return !files.some(x=>Math.abs(x.charCodeAt(0)-f)===1);}).map(p=>p.square)};
}
export function checkDefenseFacts(game){
 if(!game.isCheck())return [];
 const color=game.turn(),king=pieces(game).find(p=>p.color===color&&p.type==='k'),attackers=game.attackers(king.square,other(color)),legal=game.moves({verbose:true}),facts=[];
 for(const from of attackers){
  const piece=game.get(from),dx=king.square.charCodeAt(0)-from.charCodeAt(0),dy=Number(king.square[1])-Number(from[1]);
  if(['b','r','q'].includes(piece.type)&&(dx===0||dy===0||Math.abs(dx)===Math.abs(dy))){
   const between=[],length=Math.max(Math.abs(dx),Math.abs(dy));
   for(let i=1;i<length;i++)between.push(String.fromCharCode(from.charCodeAt(0)+Math.sign(dx)*i)+(Number(from[1])+Math.sign(dy)*i));
   facts.push(`Die Schachlinie verläuft von ${names[piece.type]} ${from} über ${between.length?between.join(' → ')+' → ':''}${king.square}. ${between.length?`Mögliche Zwischenfelder zum Blockieren wären ${join(between)}; legale Blockadezüge gibt es ${legal.filter(m=>m.piece!=='k'&&between.includes(m.to)).length?': '+listMoves(legal.filter(m=>m.piece!=='k'&&between.includes(m.to))):'keine'}.`:'Zwischen Angreifer und König liegt kein Feld; ein Dazwischenziehen ist deshalb unmöglich.'}`);
  }
 }
 const captures=legal.filter(m=>m.captured&&attackers.includes(m.to));
 facts.push(captures.length?`Die schachgebende Figur kann legal mit ${listMoves(captures)} geschlagen werden.`:'Kein legaler Schlag auf eine schachgebende Figur beseitigt das Schach.');
 const escapes=legal.filter(m=>m.piece==='k');
 facts.push(escapes.length?`Legale Königszüge zur Abwehr: ${listMoves(escapes)}.`:'Der König hat kein legales Fluchtfeld.');
 if(!escapes.length){
  const reasons=[];
  for(const sq of squareNames.filter(sq=>sq!==king.square&&Math.abs(sq.charCodeAt(0)-king.square.charCodeAt(0))<=1&&Math.abs(Number(sq[1])-Number(king.square[1]))<=1)){
   const occupant=game.get(sq);
   if(occupant?.color===color){reasons.push(`${sq}: von einer eigenen Figur besetzt (${names[occupant.type]})`);continue;}
   const trial=new Chess(game.fen());trial.remove(king.square);trial.remove(sq);trial.put({type:'k',color},sq);
   const threats=trial.attackers(sq,other(color));reasons.push(`${sq}: ${threats.length?'angegriffen von '+join(threats.map(from=>label(trial,from))):'kein legaler Königszug'}`);
  }
  facts.push('Die Nachbarfelder des Königs im Einzelnen: '+reasons.join('; ')+'.');
 }
 return facts;
}
export function moveFacts(beforeFen,move){
 const before=new Chess(beforeFen),after=new Chess(beforeFen),facts=[];
 const played=after.move({from:move.from,to:move.to,promotion:move.promotion});
 facts.push(`${side(move.color)} zieht ${accusative[move.piece]} von ${move.from} nach ${move.to}.`);
 if(played.flags.includes('e'))facts.push(`En passant: Geschlagen wird der gegnerische Bauer auf ${move.to[0]+move.from[1]}, obwohl der eigene Bauer auf ${move.to} landet. Das war nur unmittelbar nach dessen Doppelschritt erlaubt.`);
 else if(move.captured)facts.push(`Auf ${move.to} wird ${names[move.captured]} geschlagen (${values[move.captured]} Materialpunkt${values[move.captured]===1?'':'e'}). Das ist der unmittelbare Gewinn dieses Halbzuges; ein mögliches Zurückschlagen durch den Gegner ist darin noch nicht verrechnet.`);
 if(move.promotion)facts.push(`Der Bauer erreicht die letzte Reihe und wird in ${names[move.promotion]} umgewandelt. Dadurch kommen rechnerisch ${values[move.promotion]-1} Materialpunkte hinzu. Die Umwandlung ist Teil desselben Zuges.`);
 if(played.flags.includes('k')||played.flags.includes('q')){const rank=move.color==='w'?'1':'8',short=played.flags.includes('k');facts.push(`Bei dieser ${short?'kurzen':'langen'} Rochade zieht zusätzlich der Turm von ${short?'h':'a'}${rank} nach ${short?'f':'d'}${rank}. Der König gibt damit sein weiteres Rochaderecht auf. Ob er dort sicherer steht, hängt von den gegnerischen Angriffen ab.`);}
 if(after.isCheckmate())facts.push(`Schachmatt: ${side(other(move.color))} steht im Schach und hat keinen legalen Zug, der das Schach aufhebt. Die Partie ist damit entschieden.`);
 else if(after.isCheck()){const king=pieces(after).find(p=>p.color!==move.color&&p.type==='k');facts.push(`Schach gegen den König auf ${king.square}. Schachgebende Figur${after.attackers(king.square,move.color).length===1?'':'en'}: ${join(after.attackers(king.square,move.color).map(sq=>label(after,sq)))}. Jede legale Antwort muss das Schach beseitigen; ein anderer Plan kann nicht einfach weitergespielt werden.`);}
 else if(after.isStalemate())facts.push(`${side(other(move.color))} hat keinen legalen Zug, steht aber nicht im Schach: Patt, also Remis.`);
 const fromControl=controls(before,move.from,move.color),toControl=controls(after,move.to,move.color);
 const gained=toControl.filter(sq=>!fromControl.includes(sq)),lost=fromControl.filter(sq=>!toControl.includes(sq));
 facts.push(`Die gezogene Figur kontrolliert von ${move.to} aus: ${join(toControl)}. Gegenüber ihrem Ausgangsfeld kommen hinzu: ${join(gained)}. Für diese Figur entfallen: ${join(lost)}.`);
 for(const piece of pieces(after).filter(p=>p.color===move.color&&p.square!==move.to&&before.get(p.square)?.color===p.color&&before.get(p.square)?.type===p.type&&['b','r','q'].includes(p.type))){
  const old=controls(before,piece.square,piece.color),now=controls(after,piece.square,piece.color),opened=now.filter(sq=>!old.includes(sq)),closed=old.filter(sq=>!now.includes(sq));
  if(opened.length||closed.length)facts.push(`Auch die Linien von ${names[piece.type]} auf ${piece.square} ändern sich: ${opened.length?'Neu entlang ihrer Angriffslinien erreichbar sind '+join(opened)+'. ':''}${closed.length?'Nicht mehr entlang derselben Linien kontrolliert werden '+join(closed)+'. ':''}Das zeigt die indirekte Wirkung auf andere Figuren. Eigene besetzte Felder können dabei gedeckt, aber nicht betreten werden.`);
 }
 if(['n','b'].includes(move.piece)&&move.from[1]===(move.color==='w'?'1':'8')&&move.to[1]!==move.from[1])facts.push(`${names[move.piece]} verlässt die eigene Grundreihe. Das kann zur Entwicklung beitragen. Entscheidend bleibt, welche Felder die Figur erreicht und ob der Gegner sie mit Tempo angreifen kann.`);
 const targets=pieces(after).filter(p=>p.color!==move.color&&p.type!=='k'&&toControl.includes(p.square));
 if(targets.length)facts.push(`In ihrem Angriff stehen jetzt: ${targets.map(p=>`${names[p.type]} auf ${p.square}`).join(', ')}. ${targets.length>1?'Mehrere angegriffene Figuren sind ein möglicher Doppelangriff. ':''}Das allein beweist noch keinen Materialgewinn: Deckung, Fesselungen und Gegenzüge müssen mitgerechnet werden.`);
 const center=gained.filter(sq=>['d4','e4','d5','e5'].includes(sq));if(center.length)facts.push(`Der Einfluss dieser Figur auf das Zentrum nimmt auf ${join(center)} zu. Zentrumsfelder sind wichtig, weil von dort häufig beide Flügel erreichbar sind; dieser Vorteil muss gegen konkrete taktische Antworten abgewogen werden.`);
 if(move.piece==='p'){
  const old=pawnStructure(before,move.color),next=pawnStructure(after,move.color),newDoubled=next.doubled.filter(f=>!old.doubled.includes(f));
  if(newDoubled.length)facts.push(`Auf der ${join(newDoubled)}-Linie stehen danach mehrere eigene Bauern: Doppelbauern. Das kann ihre Beweglichkeit einschränken, ist aber für sich allein kein Beweis für einen schlechten Zug.`);
  const ahead=pieces(after).filter(p=>p.type==='p'&&p.color!==move.color&&Math.abs(p.square.charCodeAt(0)-move.to.charCodeAt(0))<=1&&(move.color==='w'?Number(p.square[1])>Number(move.to[1]):Number(p.square[1])<Number(move.to[1])));
  if(!move.promotion&&!ahead.length)facts.push(`Der Bauer auf ${move.to} ist ein Freibauer: Vor ihm steht auf seiner oder einer Nachbarlinie kein gegnerischer Bauer. Gegnerische Figuren können ihn trotzdem blockieren oder schlagen; eine Umwandlung ist noch nicht gesichert.`);
  if(next.isolated.includes(move.to))facts.push(`Der Bauer auf ${move.to} hat auf beiden Nachbarlinien keinen eigenen Bauern und ist damit isoliert. Er kann nicht von einem eigenen Bauern auf einer Nachbarlinie gedeckt werden; andere Figuren können ihn weiterhin schützen.`);
 }
 facts.push(...checkDefenseFacts(after));
 return {facts,before,after,move:played,controlled:toControl};
}
function replyFacts(after,move){
 const legal=after.moves({verbose:true});
 if(after.isCheckmate()||after.isStalemate())return [];
 const captures=legal.filter(m=>m.to===move.to&&m.captured),checks=legal.filter(m=>/[+#]/.test(m.san));
 const defenders=after.attackers(move.to,move.color);
 const facts=[`${side(after.turn())} hat in der Stellung nach dem Zug ${legal.length} legale Antworten.`];
 facts.push(captures.length?`Die gerade gezogene Figur auf ${move.to} kann sofort legal mit ${listMoves(captures)} geschlagen werden. Ob das günstig ist, zeigt erst das anschließende Gegenspiel.`:`Keine legale unmittelbare Antwort schlägt die gerade gezogene Figur auf ${move.to}. Das bedeutet nicht, dass andere Figuren oder der König ungefährdet sind.`);
 facts.push(`Eigene Figuren, die ${move.to} nach ihren Angriffslinien decken: ${join(defenders.map(sq=>label(after,sq)))}. Eine solche Deckung erlaubt nicht automatisch ein Zurückschlagen; eine Fesselung oder ein Schach kann es verhindern.`);
 facts.push(checks.length?`Sofortige legale Schachgebote des Gegners: ${listMoves(checks)}. Prüfe diese zuerst, weil sie deine Antwort einschränken.`:'Der Gegner hat unmittelbar danach kein legales Schachgebot. Andere Drohungen, etwa Figurengewinn oder Bauernvorstoß, sind damit nicht ausgeschlossen.');
 return facts;
}
function evaluationText(score,color){
 if(!score)return 'Noch keine Bewertung verfügbar.';
 if(score.kind==='mate'){
  if(score.value===0)return `${side(color)} ist in der bewerteten Stellung bereits matt.`;
  return score.value>0?`Stockfish findet ein erzwungenes Matt für ${side(color)} in ${Math.abs(score.value)} ${Math.abs(score.value)===1?'eigenem Zug':'eigenen Zügen'} bei bestem Gegenspiel.`:`Stockfish findet ein erzwungenes Matt gegen ${side(color)} in ${Math.abs(score.value)} ${Math.abs(score.value)===1?'Zug':'Zügen'} der mattsetzenden Seite bei bestem Gegenspiel.`;
 }
 const white=whiteScore(score,color);
 return `Bewertung aus Sicht von Weiß: ${scoreText(white)} Bauerneinheiten. ${Math.abs(score.value)<20?'Die Bewertung liegt nahe am Gleichgewicht.':`${score.value>0?side(color):side(other(color))} steht nach dieser Berechnung besser.`}`;
}
export function sequenceReport(record,pv){
 const sequence=linePositions(record.before,pv),items=[];let game=new Chess(record.before);
 for(let i=0;i<sequence.moves.length;i++){
  const move=sequence.moves[i],before=game.fen(),prefix=moveNumber(game),next=new Chess(before);next.move({from:move.from,to:move.to,promotion:move.promotion});
  const description=[`${side(move.color)} zieht ${accusative[move.piece]} von ${move.from} nach ${move.to}.`];
  if(move.flags.includes('e'))description.push(`En passant wird der Bauer auf ${move.to[0]+move.from[1]} entfernt.`);
  else if(move.captured)description.push(`${names[move.captured]} auf ${move.to} wird geschlagen.`);
  if(move.promotion)description.push(`Umwandlung in ${names[move.promotion]}.`);
  if(move.flags.includes('k')||move.flags.includes('q'))description.push(`Rochade: Auch der Turm wird umgesetzt.`);
  if(next.isCheckmate())description.push('Schachmatt – keine legale Abwehr bleibt.');
  else if(next.isCheck())description.push('Schach – der folgende Zug muss den König aus dem Schach bringen.');
  else if(next.isStalemate())description.push('Patt – die Partie ist remis.');
  if(next.isCheck())description.push(...checkDefenseFacts(next));
  if(!move.captured&&!next.isCheck()&&!next.isStalemate()){
   const targets=pieces(next).filter(p=>p.color!==move.color&&p.type!=='k'&&next.attackers(p.square,move.color).includes(move.to));
   if(targets.length)description.push(`Die gezogene Figur richtet einen Angriff auf ${targets.map(p=>names[p.type]+' '+p.square).join(', ')}. Ob daraus ein Gewinn entsteht, hängt von der Antwort ab.`);
   const controlled=controls(next,move.to,move.color),supported=pieces(next).filter(p=>p.color===move.color&&p.type!=='k'&&controlled.includes(p.square));
   if(supported.length)description.push(`Sie deckt nach ihren Angriffslinien ${supported.map(p=>names[p.type]+' '+p.square).join(', ')}. Bei gefesselten Figuren ist eine Rückschlagmöglichkeit gesondert zu prüfen.`);
   const center=controlled.filter(sq=>['d4','e4','d5','e5'].includes(sq));
   if(center.length)description.push(`Zentralfelder unter ihrem Einfluss: ${join(center)}.`);
   if(['n','b'].includes(move.piece)&&move.from[1]===(move.color==='w'?'1':'8'))description.push('Die Figur wird von der eigenen Grundreihe ins Spiel gebracht.');
   if(!targets.length&&!supported.length&&!center.length)description.push(`Von ${move.to} aus kontrolliert die Figur ${join(controlled)}. Vergleiche diese Felder mit dem folgenden Gegenzug.`);
  }
  if(i>0&&move.captured&&sequence.moves[i-1].captured&&move.to===sequence.moves[i-1].to)description.push(`Dies ist direktes Zurückschlagen auf ${move.to}. Erst zusammen mit dem vorigen Schlag ergibt sich die Tauschbilanz.`);
  const change=material(next.fen(),record.color)-material(record.before,record.color);
  description.push(`Materialänderung seit der Ausgangsstellung aus Sicht von ${side(record.color)}: ${change>0?'+':''}${number(change)}.`);
  items.push({step:i+1,title:`${prefix} ${move.san}`,paragraphs:description,text:description.join(' '),fen:next.fen()});game=next;
 }
 return {items,sequence,end:game.fen(),change:material(game.fen(),record.color)-material(record.before,record.color)};
}
export function buildReport(record,result,branch='played'){
 const before=new Chess(record.before),actual=before.moves({verbose:true}).find(m=>m.from===record.from&&m.to===record.to&&(m.promotion||null)===(record.promotion||null));
 if(!actual)return {summary:'Der gespeicherte Zug passt nicht zur Ausgangsstellung. Eine belastbare Erklärung ist deshalb nicht möglich.',sections:[],line:null};
 const detail=moveFacts(record.before,actual),sections=[];
 const own=side(record.color),enemy=side(other(record.color));
 const kings=pieces(before).filter(p=>p.type==='k');
 const initial=[`${own} ist am Zug. Königsfelder: ${kings.map(p=>`${side(p.color)} ${p.square}`).join(', ')}. ${balanceText(record.before,record.color)}`];
 if(before.isCheck()){const king=kings.find(p=>p.color===record.color),attackers=before.attackers(king.square,other(record.color));initial.push(`Der eigene König steht bereits im Schach durch ${join(attackers.map(sq=>label(before,sq)))}. Die erste Aufgabe ist deshalb zwingend die Schachabwehr. Es gibt ${before.moves().length} legale Antworten.`);}
 else initial.push(`Der eigene König steht nicht im Schach. Prüfe deshalb vor der Auswahl zuerst gegnerische Schachmöglichkeiten, ungedeckte Figuren und mögliche Schlagfolgen. Ein abstrakter Entwicklungsplan darf eine konkrete taktische Drohung nicht übersehen.`);
 const exposed=pieces(before).filter(p=>p.color===record.color&&p.type!=='k'&&before.isAttacked(p.square,other(record.color)));
 initial.push(exposed.length?`Nach den Angriffslinien stehen eigene Figuren unter gegnerischem Einfluss: ${exposed.map(p=>`${names[p.type]} ${p.square} (Angreifer: ${join(before.attackers(p.square,other(record.color)).map(sq=>label(before,sq)))})`).join('; ')}. Das sind zu prüfende Kontaktpunkte, keine bewiesenen Verluste.`:'Keine eigene Figur außer dem König steht in der Ausgangsstellung auf einem vom Gegner angegriffenen Feld. Trotzdem können mit einem Zug neue Angriffe entstehen.');
 sections.push({title:'1. Was ist vor dem Zug wichtig?',paragraphs:initial});
 sections.push({title:`2. Was verändert ${record.san} konkret?`,paragraphs:detail.facts});
 sections.push({title:'3. Was kann der Gegner unmittelbar tun?',paragraphs:replyFacts(detail.after,actual)});
 if(!result)return {summary:`Die Brettfakten zu ${record.san} stehen bereits fest. Stockfish berechnet noch, wie gut der Zug im Vergleich zu Alternativen ist.`,sections,line:null};
 const bestLine=sequenceReport(record,result.best.pv),playedLine=sequenceReport(record,result.played.pv),bestMove=bestLine.sequence.moves[0];
 if(!bestMove)return {summary:'Keine gültige Engine-Variante vorhanden. Bitte die Stellung erneut prüfen.',sections,line:null};
 const comparable=result.best.kind==='cp'&&result.played.kind==='cp',difference=comparable?result.best.value-result.played.value:null;
 let summary=result.same?`${record.san} ist bei dieser Berechnung Stockfishs erste Wahl. Die folgende Erklärung zeigt seine Wirkung und das berechnete Gegenspiel.`:difference!==null&&difference<0?`Die Nachsuche bewertet ${record.san} günstiger als die ursprüngliche erste Wahl ${bestMove.san}. Eine eindeutige Rangfolge ist deshalb noch nicht gesichert; „Genauer prüfen“ kann den Vergleich klären.`:`Stockfish bevorzugt ${bestMove.san} gegenüber ${record.san}${comparable?`, mit einem berechneten Unterschied von ${number(Math.max(0,difference)/100)} Bauerneinheiten`:'. Der entscheidende Unterschied betrifft eine Mattfolge'}.`;
 const comparison=[`Nach dem gespielten Zug ${record.san}: ${evaluationText(result.played,record.color)}`];
 if(!result.same){comparison.push(`Bei ${bestMove.san}: ${evaluationText(result.best,record.color)}`);if(comparable)comparison.push(`Rechenweg aus Sicht der ziehenden Seite (${own}): ${number(result.best.value/100)} für die zuerst bevorzugte Variante minus ${number(result.played.value/100)} für den gespielten Zug = ${number(difference/100)} Bauerneinheiten. Ein positiver Unterschied spricht für ${bestMove.san}; ein negativer zeigt einen widersprüchlichen Suchstand. Das ist eine Stellungsbewertung und kein unmittelbar verlorener Bauer.`);
 const alternative=moveFacts(record.before,bestMove);comparison.push(`Die Alternative beginnt anders: ${alternative.facts.slice(0,bestMove.captured||bestMove.promotion||bestMove.flags.includes('k')||bestMove.flags.includes('q')?2:1).join(' ')}`);
 const actualReply=playedLine.sequence.moves[1];
 if(actualReply&&/[+#]/.test(actualReply.san)){
  const sameReply=alternative.after.moves({verbose:true}).find(m=>m.from===actualReply.from&&m.to===actualReply.to&&(m.promotion||null)===(actualReply.promotion||null));
  if(!sameReply)comparison.push(`Die konkrete Antwort ${actualReply.san} ist nach ${bestMove.san} nicht legal. Damit verhindert die Alternative genau diese unmittelbare Fortsetzung.`);
  else{const test=new Chess(alternative.after.fen());test.move({from:sameReply.from,to:sameReply.to,promotion:sameReply.promotion});const defenses=test.moves();comparison.push(`Gegenprobe: Nach ${bestMove.san} wäre derselbe gegnerische Zug ${sameReply.san} ${test.isCheckmate()?'ebenfalls matt':test.isStalemate()?'Patt':`weiterhin legal, aber ${test.isCheck()?'mit Schachabwehren':'mit Antworten'} wie ${defenses.slice(0,8).join(', ')}${defenses.length>8?' und weiteren':''} beantwortbar`}. ${actualReply.san.includes('#')&&!test.isCheckmate()?'Genau darin liegt ein überprüfbarer Unterschied zur Mattstellung nach dem gespielten Zug.':''}`);}
 }
 const bestCaptures=alternative.after.moves({verbose:true}).filter(m=>m.captured&&m.to===bestMove.to),playedCaptures=detail.after.moves({verbose:true}).filter(m=>m.captured&&m.to===actual.to);
 if(playedCaptures.length&&!bestCaptures.length)comparison.push(`Ein konkreter Unterschied: Nach ${record.san} ist die gezogene Figur mit ${listMoves(playedCaptures)} sofort schlagbar. Nach ${bestMove.san} gibt es keinen legalen direkten Schlag auf deren Zielfeld ${bestMove.to}. Das ist ein Sicherheitsunterschied, beweist für sich allein aber noch nicht die gesamte Bewertungsdifferenz.`);
 if(alternative.after.isCheck()&&!detail.after.isCheck())comparison.push(`Außerdem gibt ${bestMove.san} Schach und erzwingt damit eine Königsabwehr; ${record.san} tut das nicht. Schach ist jedoch nur dann vorteilhaft, wenn die Fortsetzung ebenfalls stimmt.`);
 }
 comparison.push('Die Engine bewertet die Folgen des ersten Zuges bei berechnetem Gegenspiel, nicht nur das sichtbare Material. Königssicherheit, Aktivität und Bauernstruktur wirken mit. Aus einer einzelnen Zahl lässt sich ihr jeweiliger Anteil nicht seriös ablesen.');
 sections.push({title:'4. Warum wird dieser Zug so bewertet?',paragraphs:comparison});
 const line=branch==='best'?bestLine:playedLine;
 const consequence=[`Die ausgewählte Variante enthält ${line.items.length} Halbzüge. Ein Halbzug ist ein Zug von einer Seite. Nur der erste Zug ist der hier untersuchte Zug; die Fortsetzung ist eine berechnete Möglichkeit und nicht automatisch der tatsächliche weitere Partieverlauf.`];
 if(line.items.length>1)consequence.push(`Die erste berechnete Antwort von ${enemy} ist ${line.items[1].title}. Folge anschließend den Zügen in ihrer Reihenfolge: Ein Schlag oder Schach ist erst zusammen mit der stärksten Antwort zu beurteilen.`);
 consequence.push(`Am Ende dieser angezeigten Variante beträgt die Materialänderung für ${own} ${line.change>0?'+':''}${number(line.change)} Punkte gegenüber der Stellung vor dem untersuchten Zug. ${line.change===0?'Eine bessere oder schlechtere Engine-Bewertung muss daher nicht auf Materialgewinn beruhen.':'Das ist nur die Bilanz bis zu diesem Endpunkt; späteres Zurückschlagen kann sie wieder verändern.'}`);
 consequence.push('Materialrichtwerte: Bauer 1, Springer 3, Läufer 3, Turm 5, Dame 9. Der König wird nicht mitgezählt. Diese Richtwerte sind keine Stockfish-Bewertung.');
 sections.push({title:'5. Wie entsteht die Folge Zug für Zug?',paragraphs:consequence,line:true});
 const lesson=[];
 if(detail.after.isCheckmate())lesson.push('Hier ist das entscheidende Kriterium vollständig überprüfbar: Der König steht im Schach und kein legaler Zug wehrt es ab. Material und langfristige Pläne sind dann nicht mehr ausschlaggebend.');
 else if(detail.after.isCheck())lesson.push('Bei Schachzügen frage nicht nur „Gebe ich Schach?“, sondern „Welche legale Abwehr hat der Gegner und was bleibt danach übrig?“ Spiele dafür mindestens die erste Antwort und deinen Folgezug am Brett nach.');
 else if(detail.after.moves({verbose:true}).some(m=>m.to===actual.to&&m.captured))lesson.push(`Vor einem Zug nach ${actual.to} zuerst die unmittelbaren gegnerischen Schläge auf dieses Feld prüfen. Rechne die Schlagfolge bis nach einer möglichem Zurückschlagen durch, bevor du eine gedeckte Figur für sicher hältst.`);
 else lesson.push(`Vergleiche vor dem nächsten Zug drei Dinge: Welche Felder gewinnt oder verliert deine Figur, welche erzwingende Antwort hat der Gegner und wie sieht die Stellung nach deinem nächsten Zug aus? Die hier gezeigte Variante ist eine konkrete Übung dafür.`);
 lesson.push(`Übung: Stelle das Brett auf „Vor den Zug“. Begründe ${record.san} in eigenen Worten, sage die erste berechnete Antwort voraus und kontrolliere dann jeden Halbzug. ${result.same?'Prüfe dabei, warum der gute erste Zug allein noch nicht die ganze Partie gewinnt.':`Vergleiche anschließend mit ${bestMove.san}, ohne die Folgen der beiden Varianten miteinander zu vermischen.`}`);
 sections.push({title:'6. Was solltest du daraus mitnehmen?',paragraphs:lesson});
 sections.push({title:'7. Wie belastbar ist die Erklärung?',paragraphs:[`Stockfish rechnete hier mit mindestens Tiefe ${result.depth}; das Suchzeitlimit betrug ${number(result.time/1000)} Sekunden je Suche. Eine größere Tiefe bedeutet nicht, dass jede denkbare Variante gleich weit geprüft wurde. „Genauer prüfen“ rechnet den ausgewählten Zug erneut.`, 'Brettfakten wie legale Züge, Schach, Schläge und Materialbilanz sind aus der Stellung geprüft. Angriffslinien berücksichtigen bei der Beschreibung auch gefesselte Figuren; daraus wird kein legaler Schlag oder zwangsläufiger Gewinn abgeleitet. Varianten und Rangfolgen stammen aus der begrenzten Engine-Suche und können sich bei längerer Berechnung ändern.']});
 return {summary,sections,line};
}
