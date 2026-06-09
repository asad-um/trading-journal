const fs = require('fs');
let content = fs.readFileSync('src/lib/validations/trade.ts', 'utf8');

// We need to allow an empty string or null to be coerced to undefined, or at least not fail validation
// if a user types something like "1." or leaves the TP empty during creation.
// z.coerce.number() fails if it receives an empty string ("").
// We need to use `.or(z.literal(""))` or `.nullable()` or just a custom preprocess to handle it perfectly.

const preprocessor = `z.preprocess((val) => {
  if (val === "" || val === null || val === undefined) return 0;
  return Number(val);
}, z.number())`;

content = content.replace(/z\.coerce\.number\(\)/g, preprocessor);
fs.writeFileSync('src/lib/validations/trade.ts', content);
