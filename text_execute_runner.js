const { spawn } = require('child_process');
const path = require('path');

const vitestPath = path.resolve('node_modules', 'vitest', 'vitest.mjs');
console.log(`Running vitest from: ${vitestPath}`);

const child = spawn('node', [vitestPath, 'run'], {
    stdio: 'inherit',
    env: process.env
});

child.on('close', (code) => {
    process.exit(code);
});
