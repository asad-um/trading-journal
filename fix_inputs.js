const fs = require('fs');
let tradeForm = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// The issue: "add numbers in decimals without having it tweak out."
// This happens because React Hook Form combined with `type="number"` and `onChange` can be very aggressive
// about parsing floating-point numbers. If a user types "1.0", the trailing zero is often stripped,
// or typing "1." causes the parser to freak out because it's not a complete number yet.

// The standard robust fix in React Hook Form for financial/crypto decimals:
// Use `type="text"` instead of `type="number"` so the browser stops aggressively formatting it while typing.
// The form schema (`z.coerce.number()`) will handle turning it into a float during submission anyway!

tradeForm = tradeForm.replace(/type="number" step="any"/g, 'type="text" inputMode="decimal"');
// Let's also do it for the basic number inputs in the form
tradeForm = tradeForm.replace(/<Input type="number"/g, '<Input type="text" inputMode="decimal"');

fs.writeFileSync('src/components/trades/trade-form.tsx', tradeForm);

console.log("Decimal input fix applied.");
