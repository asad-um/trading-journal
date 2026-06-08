const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// The user found the Long/Short glow too bright/aggressive. Let's tone it down to a sleek, modern active state.
const oldLong = "className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 ${direction === 'Long' ? 'bg-win text-white shadow-[0_0_20px_rgba(34,197,94,0.6)] border-win ring-2 ring-win/50 scale-105' : 'bg-background-tertiary text-text-muted hover:bg-background-tertiary/80 hover:text-text'}`}";
const newLong = "className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-200 ${direction === 'Long' ? 'bg-win/10 text-win border-win ring-1 ring-win/50 shadow-[0_0_10px_rgba(34,197,94,0.15)]' : 'bg-background-tertiary text-text-muted border-transparent hover:bg-background-tertiary/80 hover:text-text'}`}";

const oldShort = "className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-300 ${direction === 'Short' ? 'bg-loss text-white shadow-[0_0_20px_rgba(239,68,68,0.6)] border-loss ring-2 ring-loss/50 scale-105' : 'bg-background-tertiary text-text-muted hover:bg-background-tertiary/80 hover:text-text'}`}";
const newShort = "className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-md font-bold text-sm transition-all duration-200 ${direction === 'Short' ? 'bg-loss/10 text-loss border-loss ring-1 ring-loss/50 shadow-[0_0_10px_rgba(239,68,68,0.15)]' : 'bg-background-tertiary text-text-muted border-transparent hover:bg-background-tertiary/80 hover:text-text'}`}";

content = content.replace(oldLong, newLong);
content = content.replace(oldShort, newShort);

fs.writeFileSync('src/components/trades/trade-form.tsx', content);

console.log("Buttons toned down.");
