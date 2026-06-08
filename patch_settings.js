const fs = require('fs');
let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

// The user wants to manage Strategy and Sub-strategy from Settings.
// I will build a simple Strategy Playbook manager in the "lists" tab.
const oldListsTab = `<TabsTrigger value="lists" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none pb-2">Lists & Categories</TabsTrigger>`;
const newListsTab = `<TabsTrigger value="strategies" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none pb-2">Strategies & Playbooks</TabsTrigger>
<TabsTrigger value="lists" className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-accent rounded-none pb-2">Checklists & Categories</TabsTrigger>`;

content = content.replace(oldListsTab, newListsTab);

const strategyManager = `
          {/* TAB 1.5: Strategies */}
          <TabsContent value="strategies" className="space-y-6 pt-4">
            <Card>
              <CardHeader>
                <CardTitle>Strategy Playbooks</CardTitle>
                <CardDescription>Format: "Strategy | Playbook" (e.g. Wyckoff | Blue Box)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Strategy | Sub-strategy..." 
                    value={newItemInputs['strategies_list'] || ""}
                    onChange={e => setNewItemInputs(p => ({...p, strategies_list: e.target.value}))}
                    onKeyDown={e => e.key === 'Enter' && handleAddListItem('strategies_list')}
                  />
                  <Button onClick={() => handleAddListItem('strategies_list')}><Plus className="h-4 w-4" /></Button>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {settings?.strategies_list?.map((item: any) => (
                    <div key={item.id} className="flex justify-between items-center p-2 bg-background-secondary rounded border border-border">
                      <span className="text-sm font-semibold">{item.label || item.name}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-loss" onClick={() => handleRemoveListItem('strategies_list', item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
`;

content = content.replace('          {/* TAB 2: Lists & Categories */}', strategyManager + '\n          {/* TAB 2: Lists & Categories */}');

fs.writeFileSync('src/app/settings/page.tsx', content);
