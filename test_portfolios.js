// We need to ensure that the Dashboard actually updates the "Stats" useMemo properly when the profile changes.
const fs = require('fs');

let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');

// Looking at `const avgWinPercent = profile.starting_balance > 0 ? (avgWin / profile.starting_balance) * 100 : 0;`
// If starting_balance is 0 (which the user requested as the new default), this calculation fails and returns 0 permanently!
// If the account starts with $0, "growth percentage" is mathematically infinity. We need to fall back to current_balance or default to flat PnL if starting_balance is 0.

const oldStatsCalc = `    const avgWinPercent = profile.starting_balance > 0 ? (avgWin / profile.starting_balance) * 100 : 0;
    const avgLossPercent = profile.starting_balance > 0 ? (avgLoss / profile.starting_balance) * 100 : 0;`;

const newStatsCalc = `    // If starting balance is 0, percentages break. Fallback to using current_balance if available, else just cap it at 0 to avoid Infinity errors.
    const baseForMath = profile.starting_balance > 0 ? profile.starting_balance : (profile.current_balance > 0 ? profile.current_balance : 1);
    const avgWinPercent = (avgWin / baseForMath) * 100;
    const avgLossPercent = (avgLoss / baseForMath) * 100;`;

dashboard = dashboard.replace(oldStatsCalc, newStatsCalc);
fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);

console.log("Dashboard zero-balance math fixed.");
