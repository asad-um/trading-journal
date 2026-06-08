const fs = require('fs');

let provider = fs.readFileSync('src/components/privacy-provider.tsx', 'utf8');
provider = provider.replace(/\\`\\\$\\\{prefix\}0\.00\\`/g, '`${prefix}0.00`');
provider = provider.replace(/\\`\\\$\\\{prefix\}\\\$\\\{Math\.abs\(num\)\.toFixed\(2\)\}\\`/g, '`${prefix}${Math.abs(num).toFixed(2)}`');
fs.writeFileSync('src/components/privacy-provider.tsx', provider);

let trade = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');
trade = trade.replace('</CardTitle></CardHeader></Card>', '</CardTitle>\n            <div className="flex items-center gap-2">\n              <span className="text-xs text-text-muted">Proj. Max RR:</span>\n              <Badge variant="outline" className="text-win bg-win/10">\n                1:{ (() => {\n                  const e = Number(entry_price||0);\n                  const sl = Number(stop_loss_price||0);\n                  const risk = Math.abs(e-sl);\n                  if (risk===0 || !tp_levels?.length) return \'0.00\';\n                  const tps = tp_levels.map(t=>Number(t.price||0)).filter(p=>p>0);\n                  if (!tps.length) return \'0.00\';\n                  const maxT = Math.max(...tps);\n                  const minT = Math.min(...tps);\n                  const rew = direction === \'Long\' ? maxT - e : e - minT;\n                  return rew > 0 ? (rew/risk).toFixed(2) : \'0.00\';\n                })() }\n              </Badge>\n            </div>\n          </CardHeader>');
// Find the broken Form tag
const brokenSection = `<span className="bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded text-sm">4</span> 
              Levels & Risk
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">Proj. Max RR:</span>
              <Badge variant="outline" className="text-win bg-win/10">
                1:{ (() => {
                  const e = Number(entry_price||0);
                  const sl = Number(stop_loss_price||0);
                  const risk = Math.abs(e-sl);
                  if (risk===0 || !tp_levels?.length) return '0.00';
                  const tps = tp_levels.map(t=>Number(t.price||0)).filter(p=>p>0);
                  if (!tps.length) return '0.00';
                  const maxT = Math.max(...tps);
                  const minT = Math.min(...tps);
                  const rew = direction === 'Long' ? maxT - e : e - minT;
                  return rew > 0 ? (rew/risk).toFixed(2) : '0.00';
                })() }
              </Badge>
            </div>
            {/* hidden title closer */}`;

// Let's actually rebuild the component string
