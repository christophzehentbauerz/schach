import { readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
for (const dir of ['public', 'api', 'server']) for (const file of readdirSync(dir).filter(f => f.endsWith('.js'))) execFileSync(process.execPath, ['--check', `${dir}/${file}`]);
const html = readFileSync('public/index.html', 'utf8');
if (!html.includes('Schachcoach')) throw new Error('Missing app');
console.log('JavaScript und Einstieg geprüft.');
