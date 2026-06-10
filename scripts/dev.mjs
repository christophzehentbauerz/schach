import { spawn } from 'node:child_process';

const commands = [
  ['npm', ['run', 'dev', '--workspace', 'apps/api']],
  ['npm', ['run', 'dev', '--workspace', 'apps/web']]
];

const children = commands.map(([command, args]) => {
  const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    if (code && code !== 0) process.exitCode = code;
  });
  return child;
});

function shutdown() {
  for (const child of children) child.kill('SIGTERM');
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
