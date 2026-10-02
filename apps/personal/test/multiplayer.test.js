import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
process.env.COACH_TEST_DB=':memory:';
const {database,readState,writeState}=await import('../server/store.js');
const {createPlayer,redeemLink,replaceLink}=await import('../server/players.js');
const {createRoom,joinRoom,getRoom,actOnRoom,listRooms}=await import('../server/rooms.js');
const {identity,sessionCookie}=await import('../server/identity.js');
const stateHandler=(await import('../api/state.js')).default;
const roomHandler=(await import('../api/rooms.js')).default;
const a=await createPlayer('Weiß'),b=await createPlayer('Schwarz'),c=await createPlayer('Dritte Person');
async function move(room,player,from,to){return actOnRoom(room.id,player.user.id,{action:'move',version:room.version,move:{from,to}});}
async function call(handler,user,body){let result;const res={setHeader(){},end(raw){result={status:this.statusCode,...JSON.parse(raw)};}};await handler({url:'/api/test',method:'PUT',body,headers:{cookie:sessionCookie(user.user.id),host:'localhost',origin:'http://localhost','content-type':'application/json'}},res);return result;}
test('personal links rotate and never expose the stored secret',async()=>{
 assert.deepEqual({...await redeemLink(a.token)},a.user);assert.equal(await redeemLink('x'.repeat(43)),null);
 const next=await replaceLink(a.user.id);assert.equal(await redeemLink(a.token),null);assert.deepEqual({...await redeemLink(next)},a.user);
 const db=await database();const rows=await db.query('SELECT access_hash FROM coach_players WHERE id=$1',[a.user.id]);assert.notEqual(rows[0].access_hash,next);
});
test('profiles and stale cross-profile writes stay isolated',async()=>{
 await writeState(0,{'schachcoach-test':'{"private":true}'},a.user.id);
 assert.deepEqual(await readState(b.user.id),{revision:0,data:{}});
 const wrong=await call(stateHandler,b,{userId:a.user.id,revision:0,data:{}});assert.equal(wrong.status,409);
 assert.equal((await readState(a.user.id)).revision,1);
});
test('signed identity supports owner migration and rejects tampering',()=>{
 process.env.SESSION_SECRET='test-secret'.repeat(5);const expiry=String(Date.now()+60000);
 const signature=createHmac('sha256',process.env.SESSION_SECRET).update(expiry).digest('base64url');
 assert.equal(identity({headers:{cookie:`coach_session=${expiry}.${signature}`}}),'personal');
 assert.equal(identity({headers:{cookie:sessionCookie(a.user.id)}}),a.user.id);
 assert.equal(identity({headers:{cookie:sessionCookie(a.user.id).replace(a.user.id,b.user.id)}}),null);
 assert.doesNotThrow(()=>identity({headers:{cookie:`coach_session=personal.${expiry}.${'é'.repeat(43)}`}}));
});
test('only one guest joins and only participants see or change games',async()=>{
 const r=await createRoom(a.user.id,'w','30m');assert.equal((await getRoom(r.id,b.user.id)).status,'invitation');
 const results=await Promise.allSettled([joinRoom(r.id,b.user.id),joinRoom(r.id,c.user.id)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const active=await getRoom(r.id,a.user.id),outsider=active.black.id===b.user.id?c:b;
 await assert.rejects(getRoom(r.id,outsider.user.id),e=>e.status===403);
 await assert.rejects(actOnRoom(r.id,outsider.user.id,{action:'resign',version:active.version}),e=>e.status===403);
 assert.equal((await listRooms(outsider.user.id)).length,0);
});
test('server rejects illegal, out-of-turn and simultaneous stale moves',async()=>{
 let r=await createRoom(a.user.id);r=await joinRoom(r.id,b.user.id);
 await assert.rejects(move(r,b,'e7','e5'),e=>e.status===409);
 await assert.rejects(move(r,a,'e2','e5'),e=>e.status===400);
 const results=await Promise.allSettled([move(r,a,'e2','e4'),move(r,a,'d2','d4')]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 const saved=await getRoom(r.id,b.user.id);assert.equal(saved.moves.length,1);assert.equal(saved.turn,'b');
 await assert.rejects(move(r,a,'g1','f3'),e=>e.status===409);
});
test('checkmate survives reload and is listed for both players',async()=>{
 let r=await joinRoom((await createRoom(a.user.id)).id,b.user.id);
 for(const [p,f,t]of [[a,'f2','f3'],[b,'e7','e5'],[a,'g2','g4'],[b,'d8','h4']])r=await move(r,p,f,t);
 assert.equal(r.status,'finished');assert.equal(r.result,'0-1');assert.equal(r.reason,'Schachmatt');
 assert.match((await getRoom(r.id,a.user.id)).pgn,/Qh4# 0-1/);assert.ok((await listRooms(b.user.id)).some(v=>v.id===r.id&&v.result==='0-1'));
});
test('live clocks accumulate and correspondence resets each move; offline timeout persists',async()=>{
 const db=await database();let r=await joinRoom((await createRoom(a.user.id,'w','30m')).id,b.user.id);
 await db.query('UPDATE coach_rooms SET turn_started_at=$1 WHERE id=$2 RETURNING id',[Date.now()-5000,r.id]);r=await move(r,a,'e2','e4');assert.ok(r.remaining.w<1796000);assert.ok(r.remaining.b>1799000);
 let day=await joinRoom((await createRoom(a.user.id,'w','1d')).id,b.user.id);
 await db.query('UPDATE coach_rooms SET turn_started_at=$1 WHERE id=$2 RETURNING id',[Date.now()-60000,day.id]);day=await move(day,a,'e2','e4');assert.equal(day.remaining.w,86400000);assert.ok(day.remaining.b>86399000);
 await db.query('UPDATE coach_rooms SET turn_started_at=$1 WHERE id=$2 RETURNING id',[Date.now()-86400001,day.id]);day=await getRoom(day.id,b.user.id);assert.equal(day.status,'finished');assert.equal(day.result,'1-0');assert.equal((await getRoom(day.id,a.user.id)).version,day.version);
});
test('draw requires opponent approval and resignation/cancel persist',async()=>{
 let r=await joinRoom((await createRoom(a.user.id)).id,b.user.id);
 r=await actOnRoom(r.id,a.user.id,{version:r.version,action:'offer-draw'});
 await assert.rejects(actOnRoom(r.id,a.user.id,{version:r.version,action:'accept-draw'}));
 r=await actOnRoom(r.id,b.user.id,{version:r.version,action:'accept-draw'});assert.equal(r.result,'1/2-1/2');
 r=await joinRoom((await createRoom(a.user.id)).id,b.user.id);r=await actOnRoom(r.id,b.user.id,{version:r.version,action:'resign'});assert.equal(r.result,'1-0');
 r=await createRoom(a.user.id);r=await actOnRoom(r.id,a.user.id,{version:r.version,action:'cancel'});await assert.rejects(joinRoom(r.id,b.user.id),e=>e.status===409);
});
