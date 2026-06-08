const fs = require('fs');
let content = fs.readFileSync('src/app/statistics/page.tsx', 'utf8');

content = content.replace(
  'import { InfoTooltip } from "@/components/info-tooltip";',
  'import { InfoTooltip } from "@/components/info-tooltip";\nimport { usePrivacy } from "@/components/privacy-provider";'
);

content = content.replace(
  'const [isLoading, setIsLoading] = useState(true);',
  'const [isLoading, setIsLoading] = useState(true);\n  const { blurMoney } = usePrivacy();'
);

// We need a safer regex replace since there are multiple ${...toFixed(2)} instances here
content = content.replace(
  '{stats.netPnL > 0 ? "+" : ""}${stats.netPnL.toFixed(2)}',
  '{stats.netPnL > 0 ? "+" : ""}{blurMoney(stats.netPnL)}'
);

content = content.replace(
  '{stats.expectancy > 0 ? "+" : ""}${stats.expectancy.toFixed(2)}',
  '{stats.expectancy > 0 ? "+" : ""}{blurMoney(stats.expectancy)}'
);

content = content.replace(
  '-${stats.dd.maxDrawdownAmount.toFixed(2)}',
  '-{blurMoney(stats.dd.maxDrawdownAmount)}'
);

content = content.replace(
  '-${Math.abs(stats.totalFees).toFixed(2)}',
  '-{blurMoney(stats.totalFees)}'
);

// Edge section patches
content = content.replace(
  '{strat.netPnL > 0 ? \'+\' : \'\'}${strat.netPnL.toFixed(2)}',
  '{strat.netPnL > 0 ? "+" : ""}{blurMoney(strat.netPnL)}'
);

content = content.replace(
  '{crit.netPnL > 0 ? \'+\' : \'\'}${crit.netPnL.toFixed(2)}',
  '{crit.netPnL > 0 ? "+" : ""}{blurMoney(crit.netPnL)}'
);

fs.writeFileSync('src/app/statistics/page.tsx', content);

