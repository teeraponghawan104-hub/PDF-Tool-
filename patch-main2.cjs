const fs = require('fs');
const content = fs.readFileSync('src/main.tsx', 'utf-8');
const newContent = content.replace("import { registerSW } from 'virtual:pwa-register';", "");
fs.writeFileSync('src/main.tsx', newContent);
