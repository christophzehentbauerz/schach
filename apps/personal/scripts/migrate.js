import { database, schema } from '../server/store.js';
const db = await database();
for (const statement of schema) await db.query(statement);
console.log('Speicherschema bereit. Bestehende Daten bleiben erhalten.');
