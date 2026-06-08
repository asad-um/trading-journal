const fs = require('fs');
let content = fs.readFileSync('src/lib/validations/trade.ts', 'utf8');

// Replace standard z.number() with z.coerce.number() to allow robust decimal parsing from inputs
content = content.replace(/price: z\.number\(\)\.positive\(\)/g, 'price: z.coerce.number().positive()');
content = content.replace(/position_percent: z\.number\(\)\.min\(1\)\.max\(100\)/g, 'position_percent: z.coerce.number().min(1).max(100)');
content = content.replace(/rr: z\.number\(\)/g, 'rr: z.coerce.number()');
content = content.replace(/potential_pnl: z\.number\(\)/g, 'potential_pnl: z.coerce.number()');

fs.writeFileSync('src/lib/validations/trade.ts', content);
