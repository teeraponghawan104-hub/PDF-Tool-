const fs = require('fs');
const content = fs.readFileSync('src/main.tsx', 'utf-8');
const newContent = content.replace('registerSW({ immediate: true });', '');
fs.writeFileSync('src/main.tsx', newContent);
