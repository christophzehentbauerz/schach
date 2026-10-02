import test from 'node:test';
import assert from 'node:assert/strict';
process.env.COACH_TEST_DB=':memory:';
const { readState, writeState, takeLoginAttempt }=await import('../server/store.js');
test('durable state round-trip and stale-write rejection',async()=>{
  assert.deepEqual(await readState(),{revision:0,data:{}});
  assert.equal(await writeState(0,{'schachcoach-test':'{"moves":["e4"]}'}),1);
  assert.equal(await writeState(0,{}),null);
  assert.equal(await writeState(1,{'schachcoach-test':'{"moves":["e4","e5"]}'}),2);
  assert.equal(await writeState(1,{}),null);
  assert.equal((await readState()).data['schachcoach-test'],'{"moves":["e4","e5"]}');
});
test('login attempts are limited in shared durable storage',async()=>{
  for(let i=0;i<20;i++)assert.equal(await takeLoginAttempt(),true);
  assert.equal(await takeLoginAttempt(),false);
});
