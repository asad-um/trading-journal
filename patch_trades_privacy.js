const fs = require('fs');

let content = fs.readFileSync('src/app/trades/page.tsx', 'utf8');

// 1. Import Privacy Context
content = content.replace(
  'import { useToast } from "@/hooks/use-toast";',
  'import { useToast } from "@/hooks/use-toast";\nimport { usePrivacy } from "@/components/privacy-provider";'
);

// 2. Initialize it
content = content.replace(
  'const { toast } = useToast();',
  'const { toast } = useToast();\n  const { blurMoney } = usePrivacy();'
);

// 3. Apply to Desktop Table
content = content.replace(
  '{trade.net_pnl > 0 ? "+" : ""}${trade.net_pnl.toFixed(2)}',
  '{trade.net_pnl > 0 ? "+" : ""}{blurMoney(trade.net_pnl)}'
);

// 4. Apply to Mobile Cards
content = content.replace(
  '{trade.net_pnl > 0 ? "+" : ""}${trade.net_pnl.toFixed(2)}',
  '{trade.net_pnl > 0 ? "+" : ""}{blurMoney(trade.net_pnl)}'
);

fs.writeFileSync('src/app/trades/page.tsx', content);

// Now let's do the same for the Trade Details page [id]/page.tsx
let detailContent = fs.readFileSync('src/app/trades/[id]/page.tsx', 'utf8');
detailContent = detailContent.replace(
  'import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";',
  'import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";\nimport { usePrivacy } from "@/components/privacy-provider";'
);

detailContent = detailContent.replace(
  'const [isLoading, setIsLoading] = useState(true);',
  'const [isLoading, setIsLoading] = useState(true);\n  const { blurMoney } = usePrivacy();'
);

detailContent = detailContent.replace(
  '<p className="font-mono">${trade.risk_amount_usd?.toFixed(2)}</p>',
  '<p className="font-mono">{blurMoney(trade.risk_amount_usd)}</p>'
);

detailContent = detailContent.replace(
  '<p className={`font-mono font-bold ${trade.net_pnl > 0 ? "text-win" : trade.net_pnl < 0 ? "text-loss" : ""}`}>${trade.net_pnl?.toFixed(2)}</p>',
  '<p className={`font-mono font-bold ${trade.net_pnl > 0 ? "text-win" : trade.net_pnl < 0 ? "text-loss" : ""}`}>{trade.net_pnl > 0 ? "+" : ""}{blurMoney(trade.net_pnl)}</p>'
);

fs.writeFileSync('src/app/trades/[id]/page.tsx', detailContent);

