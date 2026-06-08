const fs = require('fs');

let account = fs.readFileSync('src/app/account/page.tsx', 'utf8');

// The user noted: "I tried withdrawing more than what i had in the account and it allowed it."
// I added a fix for this earlier, let's make sure it actually survived the final write.

if (account.includes('amount > activePortfolio.current_balance')) {
    console.log("Withdrawal limit exists.");
} else {
    console.log("Withdrawal limit missing, injecting it now.");
    const oldLogic = `const amount = parseFloat(dialogAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }

    setIsSubmittingEvent(true);`;
    
    const newLogic = `const amount = parseFloat(dialogAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Please enter a valid positive number.", variant: "destructive" });
      return;
    }

    if (dialogType === 'withdrawal' && activePortfolio && amount > activePortfolio.current_balance) {
      toast({ title: "Insufficient Funds", description: "You cannot withdraw more than your current balance.", variant: "destructive" });
      return;
    }

    setIsSubmittingEvent(true);`;
    
    account = account.replace(oldLogic, newLogic);
    fs.writeFileSync('src/app/account/page.tsx', account);
}
