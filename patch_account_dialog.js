const fs = require('fs');

let content = fs.readFileSync('src/app/account/page.tsx', 'utf8');

// We are going to replace window.prompt with a proper Shadcn UI Dialog for deposits and withdrawals
content = content.replace(
  'import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";',
  `import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";`
);

content = content.replace(
  'const [newStartingBalance, setNewStartingBalance] = useState("");',
  `const [newStartingBalance, setNewStartingBalance] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'deposit' | 'withdrawal' | 'adjustment'>('deposit');
  const [dialogAmount, setDialogAmount] = useState("");
  const [isSubmittingEvent, setIsSubmittingEvent] = useState(false);`
);

const oldHandleAddEvent = `const handleAddEvent = async (type: 'deposit' | 'withdrawal' | 'adjustment') => {
    const amountStr = prompt(\`Enter amount for \${type}:\`);
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("account_events").insert({
      user_id: user.id,
      event_type: type,
      amount: amount,
      event_date: format(new Date(), "yyyy-MM-dd"),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Event added." });
      fetchData();
    }
  };`;

const newHandleAddEvent = `const openDialog = (type: 'deposit' | 'withdrawal' | 'adjustment') => {
    setDialogType(type);
    setDialogAmount("");
    setIsDialogOpen(true);
  };

  const executeAddEvent = async () => {
    const amount = parseFloat(dialogAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }

    setIsSubmittingEvent(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsSubmittingEvent(false); return; }

    const { error } = await supabase.from("account_events").insert({
      user_id: user.id,
      event_type: dialogType,
      amount: amount,
      event_date: format(new Date(), "yyyy-MM-dd"),
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: \`\${dialogType.charAt(0).toUpperCase() + dialogType.slice(1)} recorded successfully.\` });
      setIsDialogOpen(false);
      fetchData();
    }
    setIsSubmittingEvent(false);
  };`;

content = content.replace(oldHandleAddEvent, newHandleAddEvent);

// Update the buttons to trigger the dialog instead of the prompt
content = content.replace(
  /onClick=\{\(\) => handleAddEvent\('deposit'\)\}/g,
  "onClick={() => openDialog('deposit')}"
);
content = content.replace(
  /onClick=\{\(\) => handleAddEvent\('withdrawal'\)\}/g,
  "onClick={() => openDialog('withdrawal')}"
);

// Inject the Dialog component right before the closing </AppLayout>
const dialogComponent = `
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="capitalize text-xl flex items-center gap-2">
              {dialogType === 'deposit' ? <ArrowUpRight className="text-win h-5 w-5"/> : <ArrowDownRight className="text-loss h-5 w-5"/>}
              Log {dialogType}
            </DialogTitle>
            <DialogDescription>
              Enter the monetary amount to adjust your master portfolio balance.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <Label htmlFor="amount" className="text-xs uppercase tracking-wider text-text-muted mb-2 block">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={dialogAmount}
              onChange={(e) => setDialogAmount(e.target.value)}
              placeholder="e.g. 500.00"
              className="font-mono text-lg h-12"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmittingEvent}>Cancel</Button>
            <Button onClick={executeAddEvent} disabled={isSubmittingEvent || !dialogAmount} className={dialogType === 'deposit' ? 'bg-win hover:bg-win/90 text-white' : 'bg-loss hover:bg-loss/90 text-white'}>
              {isSubmittingEvent ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm {dialogType}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

content = content.replace('    </AppLayout>', dialogComponent + '\n    </AppLayout>');

fs.writeFileSync('src/app/account/page.tsx', content);

