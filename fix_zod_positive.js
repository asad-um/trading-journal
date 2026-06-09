const fs = require('fs');

let validations = fs.readFileSync('src/lib/validations/trade.ts', 'utf8');

// The Vercel build error states: TypeError: n.dj(...).positive is not a function
// This is because of the Zod custom preprocessor we wrote earlier to handle empty decimal strings.
// `z.preprocess()` returns a ZodEffects type, which does NOT have a `.positive()` chaining method directly attached to it
// like a standard `z.number()` does. 
// When Next.js compiles for production, it trips over this chaining order.

// We need to move the validation rules *inside* the base z.number() that the preprocessor wraps, 
// or simply use `.min(0)` if `.positive()` is failing in the effect chain.

// Current broken state:
// z.preprocess((val) => { ... }, z.number()).positive()
// Fix:
// z.preprocess((val) => { ... }, z.number().min(0))

validations = validations.replace(/\)\.positive\(\)/g, ').min(0)');

fs.writeFileSync('src/lib/validations/trade.ts', validations);

console.log("Zod Effect chaining error fixed.");
