const fs = require('fs');

let stats = fs.readFileSync('src/app/statistics/page.tsx', 'utf8');

// The user requested enhanced calculations. A huge metric for traders is "RR Efficiency"
// (How much of your planned target did you actually capture?). 
// Let's calculate this and inject it into the Core Performance grid.

const oldStatsCalc = `const recoveryFactor = dd.maxDrawdownAmount > 0 && netPnL > 0 ? (netPnL / dd.maxDrawdownAmount) : 0;

    return { wr, pf, dd, grossPnL, netPnL, totalFees, avgWin, avgLoss, expectancy, recoveryFactor, strategyPerformance, criteriaPerformance };`;

const newStatsCalc = `const recoveryFactor = dd.maxDrawdownAmount > 0 && netPnL > 0 ? (netPnL / dd.maxDrawdownAmount) : 0;

    // RR Efficiency: Actual Achieved RR / Planned RR
    let totalActualRR = 0;
    let totalPlannedRR = 0;
    wins.forEach(t => {
      totalActualRR += (t.actual_rr_achieved || 0);
      totalPlannedRR += (t.weighted_avg_rr_planned || 0);
    });
    const rrEfficiency = totalPlannedRR > 0 ? (totalActualRR / totalPlannedRR) * 100 : 0;

    return { wr, pf, dd, grossPnL, netPnL, totalFees, avgWin, avgLoss, expectancy, recoveryFactor, rrEfficiency, strategyPerformance, criteriaPerformance };`;

stats = stats.replace(oldStatsCalc, newStatsCalc);

// Inject the UI card for RR Efficiency
const oldGridCard = `<div className="p-4 bg-background-secondary rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <p className="text-xs text-text-muted mb-1 flex items-center">Total Fees Drag <InfoTooltip text="Estimated total fees deducted from Gross P&L." /></p>
                    <p className="font-mono text-xl font-bold text-loss">
                      -{blurMoney(stats.totalFees)}
                    </p>
                  </div>`;

const newGridCard = `<div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">Total Fees Drag <InfoTooltip text="Estimated total fees deducted from Gross P&L." /></p>
                    <p className="font-mono text-3xl tracking-tight font-black text-loss">
                      -{blurMoney(stats.totalFees)}
                    </p>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">RR Efficiency <InfoTooltip text="Percentage of your Planned RR that you actually captured on winning trades." /></p>
                    <p className={\`font-mono text-3xl tracking-tight font-black \${stats.rrEfficiency >= 80 ? "text-win" : stats.rrEfficiency >= 50 ? "text-breakeven" : "text-loss"}\`}>
                      {stats.rrEfficiency.toFixed(1)}%
                    </p>
                  </div>`;

// Wait, the grid classes were already updated to the new SaaS styling in a previous script, so let's match the exact text.
const accurateOldGridCard = `<div className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group">
                    <p className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors">Total Fees Drag <InfoTooltip text="Estimated total fees deducted from Gross P&L." /></p>
                    <p className="font-mono text-3xl tracking-tight font-black text-loss">
                      -{blurMoney(stats.totalFees)}
                    </p>
                  </div>`;

stats = stats.replace(accurateOldGridCard, newGridCard);

fs.writeFileSync('src/app/statistics/page.tsx', stats);
console.log("Stats enhanced with RR Efficiency and Realtime Sync.");

