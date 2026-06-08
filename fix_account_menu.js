const fs = require('fs');

let content = fs.readFileSync('src/app/account/page.tsx', 'utf8');

// Inject the imports needed for the DropdownMenu
content = content.replace(
  'import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";',
  `import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreVertical, Archive, Trash2 } from "lucide-react";`
);

// Inject the Archive and Delete logic handlers
const deleteLogic = `
  const handleDeleteAccount = async (id: string) => {
    if (!confirm("Are you absolutely sure you want to permanently delete this account AND all of its trades/transactions? This cannot be undone.")) return;
    
    setIsLoading(true);
    const { error } = await supabase.from('portfolios').delete().eq('id', id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Account permanently deleted." });
      if (activePortfolio?.id === id) setActivePortfolio(null); // Clear active if we just deleted it
      fetchData();
      window.location.reload(); // Refresh the entire app state to clear out ghost data
    }
    setIsLoading(false);
  };
`;

content = content.replace('const handleCreateAccount = async () => {', deleteLogic + '\n  const handleCreateAccount = async () => {');

// Inject the Dropdown Menu into the Portfolio Card Header
const oldCardHeader = `<div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-win shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Live</span>
                    </div>
                    <span className="font-bold text-foreground text-sm px-2 py-1 bg-background rounded-md border border-border/50 shadow-sm">{p.name}</span>
                  </div>`;

const newCardHeader = `<div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-win shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">Live</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm px-2 py-1 bg-background rounded-md border border-border/50 shadow-sm">{p.name}</span>
                      {!p.is_active && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-border">
                            <DropdownMenuItem className="text-loss focus:bg-loss/10 focus:text-loss cursor-pointer" onClick={() => handleDeleteAccount(p.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>`;

content = content.replace(oldCardHeader, newCardHeader);

fs.writeFileSync('src/app/account/page.tsx', content);
