const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// Fix the literal string template escaping
content = content.replace(/\\\$\\{field\.value/g, '${field.value');
content = content.replace(/\\\$\\{direction/g, '${direction');
content = content.replace(/\\\$\\{num_tp_levels/g, '${num_tp_levels');
content = content.replace(/\\\$\\{riskAmtCalculated/g, '${riskAmtCalculated');

// Add eslint-disable-next-line to the useEffect at line 310
content = content.replace(
  '  }, [form]);',
  '  }, [form, onSubmit]); // eslint-disable-line react-hooks/exhaustive-deps'
);

fs.writeFileSync('src/components/trades/trade-form.tsx', content);

