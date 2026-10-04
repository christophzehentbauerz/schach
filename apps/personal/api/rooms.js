import { configured, identity, sameOrigin } from '../server/identity.js';
import { getPlayer } from '../server/players.js';
import { takeAttempt } from '../server/store.js';
import { body, reply } from '../server/http.js';
import { createRoom, getRoom, listRooms, joinRoom, actOnRoom, RoomError } from '../server/rooms.js';
export default async function handler(req,res) {
  if(!configured())return reply(res,503,{error:'Der Spielserver ist noch nicht bereit.'});
  try {
    const user=await getPlayer(identity(req));if(!user)return reply(res,401,{error:'Bitte deinen persönlichen Zugangslink öffnen.'});
    const id=new URL(req.url,'https://localhost').searchParams.get('id');
    if(req.method==='GET')return reply(res,200,id?{room:await getRoom(id,user.id),serverNow:Date.now()}:{rooms:await listRooms(user.id),serverNow:Date.now()});
    if(req.method!=='POST')return reply(res,405,{error:'Methode nicht erlaubt.'});
    if(!sameOrigin(req))return reply(res,403,{error:'Ungültige Herkunft.'});
    let input;try{input=await body(req,2048);}catch{return reply(res,400,{error:'Ungültige Eingabe.'});}
    if(input?.userId!==user.id)return reply(res,409,{error:'Das Profil hat sich geändert. Bitte neu laden.'});
    if(!await takeAttempt('room-action:'+user.id,120,60000))return reply(res,429,{error:'Zu viele Aktionen. Bitte einen Moment warten.'});
    let room;
    if(input.action==='create')room=await createRoom(user.id,input.color,input.timeControl);
    else if(input.action==='join')room=await joinRoom(input.id,user.id);
    else room=await actOnRoom(input.id,user.id,input);
    return reply(res,200,{room,serverNow:Date.now()});
  }catch(error){if(error instanceof RoomError)return reply(res,error.status,{error:error.message});console.error('Room:',error.message);return reply(res,503,{error:'Verbindung unterbrochen. Der letzte bestätigte Spielstand bleibt erhalten.'});}
}
