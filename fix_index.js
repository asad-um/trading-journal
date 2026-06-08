const fs = require('fs');
let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// Looking at the error log from the user, the issue is that in their local file, `index` is missing from the .map() parameters.
// Let's explicitly force it back into the map parameter.
content = content.replace(
  'tpFields.map((field) => {',
  'tpFields.map((field, index) => {'
);

fs.writeFileSync('src/components/trades/trade-form.tsx', content);
