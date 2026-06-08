const fs = require('fs');
let tradeForm = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// The Long/Short buttons aren't acting right. 
// "i want the long and short buttons to reach when i click it.. maybe glow or something to confirm that i have clicked it."
// I already gave them a shadow glow, but maybe the state isn't visually sticking because of the react-hook-form bindings.

// Let's force it to be 100% reliable by using the explicit `direction` variable we pulled from `useWatch` earlier.
// If direction === 'Long', glow green.

const brokenLong = `className={\`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 \${field.value === 'Long' ? 'bg-win text-white shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'text-text-muted hover:bg-background-tertiary hover:text-text'}\`}`;
const fixedLong = `className={\`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 \${direction === 'Long' ? 'bg-win text-white shadow-[0_0_20px_rgba(34,197,94,0.6)] border-win ring-2 ring-win/50 scale-105' : 'bg-background-tertiary text-text-muted hover:bg-background-tertiary/80 hover:text-text'}\`}`;

const brokenShort = `className={\`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 \${field.value === 'Short' ? 'bg-loss text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'text-text-muted hover:bg-background-tertiary hover:text-text'}\`}`;
const fixedShort = `className={\`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 \${direction === 'Short' ? 'bg-loss text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] border-loss ring-2 ring-loss/50 scale-105' : 'bg-background-tertiary text-text-muted hover:bg-background-tertiary/80 hover:text-text'}\`}`;

tradeForm = tradeForm.replace(brokenLong, fixedLong);
tradeForm = tradeForm.replace(brokenShort, fixedShort);

fs.writeFileSync('src/components/trades/trade-form.tsx', tradeForm);

