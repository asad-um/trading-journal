const fs = require('fs');
let content = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// Inject Privacy hook
content = content.replace('const [isLoading, setIsLoading] = useState(true);', 'const [isLoading, setIsLoading] = useState(true);\n  const { isPrivate, blurMoney } = require("@/components/privacy-provider").usePrivacy();');

// Mask Dashboard monetary values
content = content.replace(/\$\{profile\.current_balance\.toFixed\(2\)\}/g, '{blurMoney(profile.current_balance)}');
content = content.replace(/\$\{profile\.starting_balance\.toFixed\(0\)\}/g, '{blurMoney(profile.starting_balance)}');
content = content.replace(/\$\{stats\.totalClosedPnL\.toFixed\(2\)\}/g, '{blurMoney(stats.totalClosedPnL, "")}');
content = content.replace(/\$\{stats\.floatingPnL\.toFixed\(2\)\}/g, '{blurMoney(stats.floatingPnL, "")}');
content = content.replace(/\$\{stats\.avgWin\.toFixed\(0\)\}/g, '{blurMoney(stats.avgWin)}');
content = content.replace(/\$\{Math\.abs\(stats\.avgLoss\)\.toFixed\(0\)\}/g, '{blurMoney(stats.avgLoss)}');
content = content.replace(/\$\{trade\.net_pnl\.toFixed\(2\)\}/g, '{blurMoney(trade.net_pnl, "")}');

// Fix XAxis and YAxis formatter
content = content.replace(
  'tickFormatter={(val: unknown) => `\\$${Number(val).toFixed(0)}`}',
  'tickFormatter={(val: unknown) => isPrivate ? "****" : `\\$${Number(val).toFixed(0)}`}'
);
content = content.replace(
  'formatter={(value: unknown) => [`\\$${Number(value).toFixed(2)}`, \'Cumulative P&L\']}',
  'formatter={(value: unknown) => [isPrivate ? "****" : `\\$${Number(value).toFixed(2)}`, \'Cumulative P&L\']}'
);

fs.writeFileSync('src/app/dashboard/page.tsx', content);
