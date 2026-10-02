import { configured, identity, sessionCookie, sameOrigin, clientRateKey } from './identity.js';
import { takeAttempt } from './store.js';
import { getPlayer, createPlayer, redeemLink, replaceLink } from './players.js';
import { body, reply } from './http.js';
export default async function handler(req,res) {
  if(!configured())return reply(res,503,{error:'Der Zugang wird gerade eingerichtet.'});
  try {
    const user=await getPlayer(identity(req));
    if(req.method==='GET')return reply(res,200,{user});
    if(!sameOrigin(req))return reply(res,403,{error:'Ungültige Herkunft.'});
    if(req.method==='DELETE'){res.setHeader('Set-Cookie',sessionCookie());return reply(res,200,{ok:true});}
    if(req.method!=='POST')return reply(res,405,{error:'Methode nicht erlaubt.'});
    let input;try{input=await body(req,2048);}catch{return reply(res,400,{error:'Ungültige Eingabe.'});}
    if(!input||typeof input!=='object')return reply(res,400,{error:'Ungültige Eingabe.'});
    if(input.action==='new-link'){
      if(!user)return reply(res,401,{error:'Bitte zuerst deinen Zugangslink öffnen.'});
      if(!await takeAttempt('link:'+user.id,10,3600000))return reply(res,429,{error:'Bitte später erneut versuchen.'});
      return reply(res,200,{token:await replaceLink(user.id),user});
    }
    if(!await takeAttempt(clientRateKey(req,'access'),60,3600000))return reply(res,429,{error:'Zu viele Versuche. Bitte später erneut versuchen.'});
    if(input.action==='redeem'){
      const target=await redeemLink(input.token);
      if(!target)return reply(res,401,{error:'Dieser Zugangslink ist ungültig oder wurde ersetzt.'});
      res.setHeader('Set-Cookie',sessionCookie(target.id));return reply(res,200,{user:target});
    }
    if(input.action==='create'){
      if(user)return reply(res,409,{error:'Du hast schon ein geöffnetes Profil. Melde dich zuerst ab, um ein anderes anzulegen.'});
      if(!await takeAttempt(clientRateKey(req,'create'),20,86400000))return reply(res,429,{error:'Heute wurden hier bereits viele Profile erstellt. Bitte einen vorhandenen Zugangslink verwenden.'});
      let player;try{player=await createPlayer(input.name);}catch(error){if(error.message.startsWith('Bitte'))return reply(res,400,{error:error.message});throw error;}
      res.setHeader('Set-Cookie',sessionCookie(player.user.id));return reply(res,201,player);
    }
    return reply(res,400,{error:'Unbekannte Aktion.'});
  }catch(error){console.error('Session:',error.message);return reply(res,503,{error:'Zugang momentan nicht erreichbar. Bitte erneut versuchen.'});}
}
