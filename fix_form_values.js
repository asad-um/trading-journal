const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// I replaced `field.value` with `direction` earlier blindly, breaking the Select components.
content = content.replace(/defaultValue=\{direction\}/g, 'defaultValue={field.value}');
content = content.replace(/value=\{direction\}/g, 'value={field.value}');

fs.writeFileSync('src/components/trades/trade-form.tsx', content);

