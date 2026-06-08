const fs = require('fs');

let layout = fs.readFileSync('src/app/layout.tsx', 'utf8');
layout = layout.replace('import { ThemeProvider }\nimport { PrivacyProvider } from "@/components/privacy-provider"; from "@/components/theme-provider";', 'import { ThemeProvider } from "@/components/theme-provider";\nimport { PrivacyProvider } from "@/components/privacy-provider";');
fs.writeFileSync('src/app/layout.tsx', layout);

let appLayout = fs.readFileSync('src/components/layout/app-layout.tsx', 'utf8');
appLayout = appLayout.replace('import { ThemeToggle }\nimport { Eye, EyeOff } from "lucide-react";\nimport { usePrivacy } from "@/components/privacy-provider"; from "@/components/theme-toggle";', 'import { ThemeToggle } from "@/components/theme-toggle";\nimport { Eye, EyeOff } from "lucide-react";\nimport { usePrivacy } from "@/components/privacy-provider";');
fs.writeFileSync('src/components/layout/app-layout.tsx', appLayout);

let provider = fs.readFileSync('src/components/privacy-provider.tsx', 'utf8');
provider = provider.replace('return \\`\\$\\{prefix}0.00\\`;', 'return `${prefix}0.00`;');
provider = provider.replace('return \\`\\$\\{prefix}\\$\\{Math.abs(num).toFixed(2)}\\`;', 'return `${prefix}${Math.abs(num).toFixed(2)}`;');
fs.writeFileSync('src/components/privacy-provider.tsx', provider);

let trade = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');
// Fix the stray string tag
trade = trade.replace('            {/* hidden title closer */}', '            </CardTitle>');
fs.writeFileSync('src/components/trades/trade-form.tsx', trade);
