const fs = require('fs');

let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

// 1. Rename default tab
content = content.replace(
  '<Tabs defaultValue="preferences" className="w-full">',
  '<Tabs defaultValue="general" className="w-full">'
);

// 2. Replace TabsList with a much cleaner version
const oldTabsListRegex = /<TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 space-x-8 overflow-x-auto flex-nowrap md:flex-wrap">[\s\S]*?<\/TabsList>/;
const newTabsList = `<TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 space-x-8 overflow-x-auto flex-nowrap md:flex-wrap">
            <TabsTrigger value="general" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">General</TabsTrigger>
            <TabsTrigger value="strategies" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Playbooks</TabsTrigger>
            <TabsTrigger value="lists" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Checklists</TabsTrigger>
            <TabsTrigger value="assets" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Assets & Platforms</TabsTrigger>
            <TabsTrigger value="export" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap">Data Export</TabsTrigger>
          </TabsList>`;
content = content.replace(oldTabsListRegex, newTabsList);

// 3. Extract and remove the detached danger zone from the bottom
const dangerZoneStart = content.indexOf('{/* Detached Danger Zone */}');
const dangerZoneEnd = content.indexOf('</div>\n\n      </div>\n    </AppLayout>');
let dangerZoneHtml = "";

if (dangerZoneStart !== -1 && dangerZoneEnd !== -1) {
    // Extract the block (but trim the extra wrapping div if possible, actually let's just grab the whole thing and tweak it)
    dangerZoneHtml = content.substring(dangerZoneStart, dangerZoneEnd);
    
    // Remove it from the bottom
    content = content.substring(0, dangerZoneStart) + '\n      </div>\n    </AppLayout>';
}

// Transform the danger zone to fit inside a tab nicely without the heavy margin top if it's already in a tab
dangerZoneHtml = dangerZoneHtml.replace('className="mt-16 pt-8 border-t border-border/50"', 'className="mt-12 pt-8 border-t border-border/50"');
dangerZoneHtml = dangerZoneHtml.replace('{/* Detached Danger Zone */}', '{/* Danger Zone (Now integrated into General Tab) */}');

// 4. Update the "preferences" tab to "general" and inject the Danger Zone at the bottom of it, plus add a Theme selector to make it useful.
const oldPreferencesTabRegex = /<TabsContent value="preferences" className="space-y-6 pt-4">[\s\S]*?<\/TabsContent>/;

// Note: I need to make sure we use next-themes here, but since page.tsx doesn't import useTheme, I'll add the import
if (!content.includes('useTheme')) {
  content = content.replace('import { useToast } from "@/hooks/use-toast";', 'import { useToast } from "@/hooks/use-toast";\nimport { useTheme } from "next-themes";');
}

// Also hook it up in the component
if (!content.includes('const { theme, setTheme } = useTheme();')) {
  content = content.replace('const { toast } = useToast();', 'const { toast } = useToast();\n  const { theme, setTheme } = useTheme();');
}

const newGeneralTab = `<TabsContent value="general" className="space-y-8 pt-4 outline-none">
            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Trade Preferences</CardTitle>
                <CardDescription>Default settings applied when you log a new trade.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-text-muted font-semibold">Default Risk (%)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        step="0.1" 
                        value={profile?.default_risk_percentage || 0} 
                        onChange={(e) => setProfile(prev => prev ? { ...prev, default_risk_percentage: parseFloat(e.target.value) } : null)}
                        className="bg-background-secondary border-border/50 focus-visible:ring-primary/50"
                      />
                      <Button variant="secondary" onClick={() => handleUpdateProfile('default_risk_percentage', profile?.default_risk_percentage || 0)}>Save</Button>
                    </div>
                    <p className="text-xs text-text-muted">Calculates risk amount automatically based on your active portfolio balance.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-text-muted font-semibold">Display Currency</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="text" 
                        value={profile?.currency || 'USD'} 
                        onChange={(e) => setProfile(prev => prev ? { ...prev, currency: e.target.value } : null)}
                        className="bg-background-secondary border-border/50 focus-visible:ring-primary/50 uppercase"
                      />
                      <Button variant="secondary" onClick={() => handleUpdateProfile('currency', profile?.currency || 'USD')}>Save</Button>
                    </div>
                    <p className="text-xs text-text-muted">Visual label only (e.g. USD, EUR, GBP).</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm bg-background">
              <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the interface theme.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <Button 
                    variant={theme === 'light' ? 'default' : 'outline'} 
                    onClick={() => setTheme('light')}
                    className={theme === 'light' ? 'bg-primary text-primary-foreground' : 'text-text-muted'}
                  >
                    Light Mode
                  </Button>
                  <Button 
                    variant={theme === 'dark' ? 'default' : 'outline'} 
                    onClick={() => setTheme('dark')}
                    className={theme === 'dark' ? 'bg-primary text-primary-foreground' : 'text-text-muted'}
                  >
                    Dark Mode
                  </Button>
                </div>
              </CardContent>
            </Card>

            ${dangerZoneHtml}
          </TabsContent>`;

content = content.replace(oldPreferencesTabRegex, newGeneralTab);

// Clean up: since we moved Danger Zone into General tab, let's make sure it rendered properly
// The replacement logic is safe.

fs.writeFileSync('src/app/settings/page.tsx', content);

console.log("Settings Page successfully refactored.");
