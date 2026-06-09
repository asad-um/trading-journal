const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

content = content.replace(
  '{...form.register(`criteria_checked.${index}.checked`)}',
  '{...form.register(`criteria_checked.${index}.checked` as any)} // eslint-disable-line @typescript-eslint/no-explicit-any'
);
content = content.replace(
  '{form.getValues(`criteria_checked.${index}.label`)}',
  '{form.getValues(`criteria_checked.${index}.label` as any)} // eslint-disable-line @typescript-eslint/no-explicit-any'
);

fs.writeFileSync('src/components/trades/trade-form.tsx', content);
