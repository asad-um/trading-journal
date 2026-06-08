const fs = require('fs');

let content = fs.readFileSync('src/app/account/page.tsx', 'utf8');

// 1. Add withdrawal limit logic
const withdrawalLogicOld = `const executeAddEvent = async () => {
    const amount = parseFloat(dialogAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }

    setIsSubmittingEvent(true);`;

const withdrawalLogicNew = `const executeAddEvent = async () => {
    const amount = parseFloat(dialogAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }

    if (dialogType === 'withdrawal' && activePortfolio && amount > activePortfolio.current_balance) {
      toast({ title: "Insufficient Funds", description: "You cannot withdraw more than your current balance.", variant: "destructive" });
      return;
    }

    setIsSubmittingEvent(true);`;

content = content.replace(withdrawalLogicOld, withdrawalLogicNew);

// 2. Allow active accounts to be deleted/deactivated.
// Let's remove the `{!p.is_active && (` wrapper around the DropdownMenu so all accounts can be deleted/deactivated.

const oldMenuWrapper = `{!p.is_active && (
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
                      )}`;

const newMenuWrapper = `<DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-text-muted hover:text-foreground">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-background border-border">
                            <DropdownMenuItem className="focus:bg-background-tertiary cursor-pointer" onClick={() => {
                              supabase.from('portfolios').update({ is_active: false }).eq('id', p.id).then(() => window.location.reload());
                            }}>
                              Deactivate Account
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-loss focus:bg-loss/10 focus:text-loss cursor-pointer" onClick={() => handleDeleteAccount(p.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>`;

content = content.replace(oldMenuWrapper, newMenuWrapper);

fs.writeFileSync('src/app/account/page.tsx', content);

console.log("Account logic patched.");
