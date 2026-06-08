const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

content = content.replace(
  '<FormField control={form.control} name="direction" render={({ field }) => (',
  '<FormField control={form.control} name="direction" render={() => ('
);

content = content.replace(
  /field\.value/g,
  'direction'
);

fs.writeFileSync('src/components/trades/trade-form.tsx', content);

