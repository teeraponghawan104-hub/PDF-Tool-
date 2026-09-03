const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf-8');
console.log("App.tsx exists and is readable");
