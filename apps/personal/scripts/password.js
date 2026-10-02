import { randomBytes, scryptSync } from 'node:crypto';
process.stdout.write('Passwort per stdin eingeben (mindestens 12 Zeichen). Eingabe wird nicht ausgegeben.\n');
let password='';for await(const chunk of process.stdin)password+=chunk;
password=password.trim();if(password.length<12)throw new Error('Mindestens 12 Zeichen erforderlich');
const salt=randomBytes(16).toString('hex');
console.log(salt+':'+scryptSync(password,salt,64).toString('hex'));
