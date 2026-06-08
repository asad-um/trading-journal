const fs = require('fs');

let provider = fs.readFileSync('src/components/privacy-provider.tsx', 'utf8');
provider = provider.replace(/\\`\\\$\\\{prefix\}0\.00\\`/g, '`${prefix}0.00`');
provider = provider.replace(/\\`\\\$\\\{prefix\}\\\$\\\{Math\.abs\(num\)\.toFixed\(2\)\}\\`/g, '`${prefix}${Math.abs(num).toFixed(2)}`');
fs.writeFileSync('src/components/privacy-provider.tsx', provider);

let trade = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');
trade = trade.replace('</CardHeader>', '</CardHeader></Card>');
trade = trade.replace('<Card className="border-border/50 shadow-sm bg-background">\n          <CardHeader className="flex flex-row justify-between items-start">', '<Card className="border-border/50 shadow-sm bg-background">\n          <CardHeader className="flex flex-row justify-between items-start">');
fs.writeFileSync('src/components/trades/trade-form.tsx', trade);
