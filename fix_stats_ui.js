const fs = require('fs');
let content = fs.readFileSync('src/app/statistics/page.tsx', 'utf8');

// The user wants the Statistics page charts and design to be improved/modernized.
// Let's replace the basic 3-metric donut chart with a more sophisticated composite chart layout,
// and make the stat cards look more premium (SaaS styling, gradients, better spacing).

// 1. Upgrade the Win Rate Donut Chart
const oldDonut = `<div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Wins', value: stats.wr.wins, color: '#22c55e' },
                            { name: 'Losses', value: stats.wr.losses, color: '#ef4444' },
                            { name: 'Breakevens', value: stats.wr.breakevens, color: '#f59e0b' },
                          ]}
                          cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                        >
                          {
                            [
                              { name: 'Wins', value: stats.wr.wins, color: '#22c55e' },
                              { name: 'Losses', value: stats.wr.losses, color: '#ef4444' },
                              { name: 'Breakevens', value: stats.wr.breakevens, color: '#f59e0b' },
                            ].map((entry, index) => (
                              <Cell key={\`cell-\${index}\`} fill={entry.color} />
                            ))
                          }
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>`;

const newDonut = `<div className="h-[220px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Wins', value: stats.wr.wins, color: 'hsl(142, 71%, 45%)' },
                            { name: 'Losses', value: stats.wr.losses, color: 'hsl(0, 84%, 60%)' },
                            { name: 'Breakevens', value: stats.wr.breakevens, color: 'hsl(38, 92%, 50%)' },
                          ]}
                          cx="50%" cy="50%" innerRadius={70} outerRadius={90} paddingAngle={8} dataKey="value"
                          stroke="none"
                          cornerRadius={4}
                        >
                          {
                            [
                              { name: 'Wins', value: stats.wr.wins, color: 'hsl(142, 71%, 45%)' },
                              { name: 'Losses', value: stats.wr.losses, color: 'hsl(0, 84%, 60%)' },
                              { name: 'Breakevens', value: stats.wr.breakevens, color: 'hsl(38, 92%, 50%)' },
                            ].map((entry, index) => (
                              <Cell key={\`cell-\${index}\`} fill={entry.color} className="drop-shadow-md hover:opacity-80 transition-opacity" />
                            ))
                          }
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'hsl(var(--popover))', borderColor: 'hsl(var(--border))', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ color: 'hsl(var(--popover-foreground))', fontWeight: 600 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-4xl font-black text-foreground drop-shadow-md">{stats.wr.winRate.toFixed(0)}%</span>
                      <span className="text-[10px] uppercase tracking-widest text-text-muted mt-1 font-semibold">Win Rate</span>
                    </div>
                  </div>`;

content = content.replace(oldDonut, newDonut);

// Remove the old text that was sitting under the chart since we centered it inside the donut hole
content = content.replace(
  `<div className="text-center pb-6 mt-4">
                    <p className="text-4xl font-bold">{stats.wr.winRate.toFixed(1)}%</p>
                    <p className="text-sm text-text-muted mt-1">Consistency Metric</p>
                  </div>`,
  `<div className="flex justify-center gap-4 mt-6 pb-2">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-win"></div><span className="text-xs font-medium">{stats.wr.wins} W</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-loss"></div><span className="text-xs font-medium">{stats.wr.losses} L</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-breakeven"></div><span className="text-xs font-medium">{stats.wr.breakevens} BE</span></div>
                  </div>`
);

// 2. Enhance the Performance Metric Cards (More SaaS, less basic borders)
content = content.replace(/className="p-4 bg-background-secondary rounded-lg border border-border hover:border-primary\/50 transition-colors"/g, 'className="p-5 bg-gradient-to-br from-background-secondary to-background rounded-xl border border-border/60 hover:border-primary/40 hover:shadow-[0_0_15px_rgba(var(--primary),0.05)] transition-all duration-300 group"');

// Slightly larger text for the metrics inside
content = content.replace(/className="text-xs text-text-muted mb-1 flex items-center"/g, 'className="text-xs font-semibold text-text-muted mb-2 flex items-center uppercase tracking-wider group-hover:text-foreground transition-colors"');
content = content.replace(/className={\`font-mono text-xl font-bold/g, 'className={`font-mono text-3xl tracking-tight font-black');
content = content.replace(/className="font-mono text-xl font-bold text-loss"/g, 'className="font-mono text-3xl tracking-tight font-black text-loss"');

fs.writeFileSync('src/app/statistics/page.tsx', content);
