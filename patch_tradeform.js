const fs = require('fs');
let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// 1. Fix Long/Short buttons to explicitly use form.setValue
content = content.replace(
  "onClick={() => field.onChange('Long')}",
  "onClick={() => form.setValue('direction', 'Long')}"
);
content = content.replace(
  "onClick={() => field.onChange('Short')}",
  "onClick={() => form.setValue('direction', 'Short')}"
);

// 2. Remove Cloudinary "demo" check block to allow live uploads
const demoCheck = `if (!cloudName || !uploadPreset || cloudName === 'demo') {
      toast({ title: "Upload Failed", description: "Cloudinary keys not configured in .env.local", variant: "destructive" });
      return;
    }`;
content = content.replace(demoCheck, 
  `if (!cloudName || !uploadPreset) {
      toast({ title: "Upload Failed", description: "Cloudinary keys missing from .env.local", variant: "destructive" });
      return;
    }`
);

// 3. Add Overall RR projection next to "Levels & Risk"
content = content.replace(
  '<span className="bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded text-sm">4</span> \n              Levels & Risk',
  `<span className="bg-purple-500/20 text-purple-500 px-2 py-0.5 rounded text-sm">4</span> 
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
            {/* hidden title closer */}`
);
content = content.replace('</CardTitle>\n          </CardHeader>', '</CardHeader>');

fs.writeFileSync('src/components/trades/trade-form.tsx', content);
