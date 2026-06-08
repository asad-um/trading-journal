const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// There must be a syntax error slightly BEFORE line 322 causing Form to be unexpected.
// Looking at the previous block:

const lines = content.split('\n');
for (let i=310; i < 330; i++) {
   console.log(i + ": " + lines[i]);
}

