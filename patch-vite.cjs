const fs = require('fs');
const content = fs.readFileSync('vite.config.ts', 'utf-8');
const newContent = content.replace("import { VitePWA } from 'vite-plugin-pwa';", "");
fs.writeFileSync('vite.config.ts', newContent);
