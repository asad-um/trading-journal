const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// There are extra nested tags: 
// </CardTitle>
// </CardTitle>

const broken = `                1:{'0.00'}
              </Badge>
            </div>
            </CardTitle>
            </CardTitle>
          </CardHeader>`;

const fixed = `                1:{(function(){
                  const e = Number(entry_price||0);
                  const sl = Number(stop_loss_price||0);
                  const risk = Math.abs(e-sl);
                  if (risk===0 || !tp_levels?.length) return '0.00';
                  const tps = tp_levels.map((t: any)=>Number(t.price||0)).filter((p: number)=>p>0);
                  if (!tps.length) return '0.00';
                  const maxT = Math.max(...tps);
                  const minT = Math.min(...tps);
                  const rew = direction === 'Long' ? maxT - e : e - minT;
                  return rew > 0 ? (rew/risk).toFixed(2) : '0.00';
                })()}
              </Badge>
            </div>
          </CardHeader>`;

content = content.replace(broken, fixed);

fs.writeFileSync('src/components/trades/trade-form.tsx', content);

