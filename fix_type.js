const fs = require('fs');

// We also need to fix the TS cast back since I broke it on the last projection optimization.
let content = fs.readFileSync('src/app/trades/page.tsx', 'utf8');
content = content.replace('setTrades(data as unknown as Trade[]);', 'setTrades(data as any[]); // eslint-disable-line @typescript-eslint/no-explicit-any');
fs.writeFileSync('src/app/trades/page.tsx', content);

