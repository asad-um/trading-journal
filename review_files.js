const fs = require('fs');

// 1. Check Danger Zone placement in Settings
let settings = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

// Looking at the current Settings structure:
// It uses Tabs: Preferences | Strategies | Checklists | Assets | Export | Danger Zone
// The user wants Danger Zone detached from the main Tabs and placed at the very bottom of the page,
// as a completely separate, standalone section (because it's rarely used and shouldn't clutter primary navigation).

const oldTabsStr = `<TabsTrigger value="danger" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-loss rounded-none pb-3 px-1 font-medium text-loss data-[state=active]:text-loss whitespace-nowrap">Danger Zone</TabsTrigger>`;
settings = settings.replace(oldTabsStr, '');

const oldDangerContent = `          {/* TAB 5: Danger Zone */}
          <TabsContent value="danger" className="pt-4">
            <Card className="border-loss/50">
              <CardHeader>
                <CardTitle className="text-loss">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-text-muted">Deleting your account is permanent. It will erase all your trades, account history, and settings.</p>
                <Button variant="destructive" onClick={() => alert("Contact support to delete account.")}>Delete Account</Button>
              </CardContent>
            </Card>
          </TabsContent>`;
          
settings = settings.replace(oldDangerContent, '');

// Append it to the very bottom, outside the Tabs component
const newDangerSection = `
        {/* Detached Danger Zone */}
        <div className="mt-16 pt-8 border-t border-border/50">
          <Card className="border-loss/30 bg-loss/5">
            <CardHeader>
              <CardTitle className="text-loss text-lg">Danger Zone</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <p className="text-sm text-text-muted max-w-lg">
                Permanently delete your account, wiping all trade history, portfolio ledgers, and custom playbooks. This action cannot be undone.
              </p>
              <Button variant="destructive" onClick={() => {
                if(confirm("Are you absolutely sure you want to permanently delete your account and all data?")) {
                  alert("Please contact admin to finalize deletion of database rows.");
                }
              }}>Delete Account</Button>
            </CardContent>
          </Card>
        </div>
`;

// Insert before the closing div of the main container
settings = settings.replace('</Tabs>\n      </div>', '</Tabs>\n' + newDangerSection + '\n      </div>');
fs.writeFileSync('src/app/settings/page.tsx', settings);

