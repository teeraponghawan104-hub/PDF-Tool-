const fs = require('fs');
const content = fs.readFileSync('vite.config.ts', 'utf-8');
const newContent = content.replace(/VitePWA\(\{[\s\S]*?\}\)/, '');
fs.writeFileSync('vite.config.ts', newContent);
