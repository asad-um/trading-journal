const fs = require('fs');

let content = fs.readFileSync('src/app/statistics/page.tsx', 'utf8');

// Insert new metrics calculations
const newStatsLogic = `
    const strategyStats: Record<string, { wins: number; total: number; netPnL: number }> = {};
    const criteriaStats: Record<string, { wins: number; total: number; netPnL: number }> = {};

    closed.forEach(t => {
      const isWin = t.net_pnl > 0;
      
      // Strategy stats
      const stratKey = t.sub_strategy ? \`\${t.strategy} - \${t.sub_strategy}\` : (t.strategy || t.schematic);
      if (!strategyStats[stratKey]) strategyStats[stratKey] = { wins: 0, total: 0, netPnL: 0 };
      strategyStats[stratKey].total += 1;
      if (isWin) strategyStats[stratKey].wins += 1;
      strategyStats[stratKey].netPnL += t.net_pnl;

      // Criteria stats
      if (t.criteria_checked && Array.isArray(t.criteria_checked)) {
        t.criteria_checked.forEach((c: any) => {
          if (c.checked) {
            const cKey = c.label;
            if (!criteriaStats[cKey]) criteriaStats[cKey] = { wins: 0, total: 0, netPnL: 0 };
            criteriaStats[cKey].total += 1;
            if (isWin) criteriaStats[cKey].wins += 1;
            criteriaStats[cKey].netPnL += t.net_pnl;
          }
        });
      }
    });

    const strategyPerformance = Object.entries(strategyStats)
      .map(([name, data]) => ({
        name,
        winRate: (data.wins / data.total) * 100,
        total: data.total,
        netPnL: data.netPnL
      }))
      .sort((a, b) => b.winRate - a.winRate);

    const criteriaPerformance = Object.entries(criteriaStats)
      .map(([name, data]) => ({
        name,
        winRate: (data.wins / data.total) * 100,
        total: data.total,
        netPnL: data.netPnL
      }))
      .filter(c => c.total >= 1) // Filter out noise if needed
      .sort((a, b) => b.winRate - a.winRate);
`;

content = content.replace(
  'return { wr, pf, dd, grossPnL, netPnL, totalFees, avgWin, avgLoss, expectancy, recoveryFactor };',
  newStatsLogic + '\n    return { wr, pf, dd, grossPnL, netPnL, totalFees, avgWin, avgLoss, expectancy, recoveryFactor, strategyPerformance, criteriaPerformance };'
);

const newUI = `
            {/* Edge Analysis Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Strategy & Playbook Edge</CardTitle>
                  <CardDescription>Win rates based on your specific setups.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stats.strategyPerformance.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-4">No strategy data available.</p>
                  ) : (
                    stats.strategyPerformance.map((strat: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-background-secondary rounded-lg border border-border">
                        <div className="flex-1">
                          <p className="font-semibold text-sm truncate pr-4">{strat.name}</p>
                          <p className="text-xs text-text-muted mt-1">{strat.total} trades</p>
                        </div>
                        <div className="text-right">
                          <p className={\`font-bold \${strat.winRate >= 50 ? 'text-win' : 'text-loss'}\`}>{strat.winRate.toFixed(1)}%</p>
                          <p className={\`text-xs font-mono mt-1 \${strat.netPnL > 0 ? 'text-win' : 'text-loss'}\`}>{strat.netPnL > 0 ? '+' : ''}\${strat.netPnL.toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Confluence & Criteria Impact</CardTitle>
                  <CardDescription>How specific validations impact your win rate.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {stats.criteriaPerformance.length === 0 ? (
                    <p className="text-sm text-text-muted text-center py-4">No criteria data available.</p>
                  ) : (
                    stats.criteriaPerformance.map((crit: any, i: number) => (
                      <div key={i} className="flex justify-between items-center p-3 bg-background-secondary rounded-lg border border-border">
                        <div className="flex-1">
                          <p className="font-semibold text-sm truncate pr-4">{crit.name}</p>
                          <p className="text-xs text-text-muted mt-1">Present in {crit.total} trades</p>
                        </div>
                        <div className="text-right">
                          <p className={\`font-bold \${crit.winRate >= 50 ? 'text-win' : 'text-loss'}\`}>{crit.winRate.toFixed(1)}%</p>
                          <p className={\`text-xs font-mono mt-1 \${crit.netPnL > 0 ? 'text-win' : 'text-loss'}\`}>{crit.netPnL > 0 ? '+' : ''}\${crit.netPnL.toFixed(2)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
`;

content = content.replace('</div>\n          </div>\n        )}\n      </div>', '</div>\n' + newUI + '\n          </div>\n        )}\n      </div>');

fs.writeFileSync('src/app/statistics/page.tsx', content);
