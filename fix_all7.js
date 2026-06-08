const fs = require('fs');

let provider = fs.readFileSync('src/components/privacy-provider.tsx', 'utf8');
provider = provider.replace("return \\`\\$\\{prefix\\}0.00\\`;", "return `${prefix}0.00`;");
provider = provider.replace("return \\`\\$\\{prefix\\}\\$\\{Math.abs(num).toFixed(2)\\}\\`;", "return `${prefix}${Math.abs(num).toFixed(2)}`;");
fs.writeFileSync('src/components/privacy-provider.tsx', provider);

// Form has structural damage due to a failed string replace earlier. Let's just download the known good state and patch.
