const fs = require('fs');
let provider = fs.readFileSync('src/components/privacy-provider.tsx', 'utf8');
provider = provider.replace(/\\`\\\$\\{prefix\\}0\.00\\`/g, '`${prefix}0.00`');
provider = provider.replace(/\\`\\\$\\{prefix\\}\\\$\\{Math\.abs\(num\)\.toFixed\(2\)\\}\\`/g, '`${prefix}${Math.abs(num).toFixed(2)}`');
fs.writeFileSync('src/components/privacy-provider.tsx', provider);
