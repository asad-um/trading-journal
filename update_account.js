const fs = require('fs');

let accountStr = fs.readFileSync('src/app/account/page.tsx', 'utf8');

// Remove the "Subscription (Pro)" tab completely
accountStr = accountStr.replace(
  /<TabsTrigger value="billing" className="data-\[state=active\]:bg-transparent data-\[state=active\]:shadow-none data-\[state=active\]:border-b-2 data-\[state=active\]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-\[state=active\]:text-foreground" disabled>\s*<CreditCard className="h-4 w-4 mr-2" \/> Subscription \(Pro\)\s*<\/TabsTrigger>/,
  ''
);

fs.writeFileSync('src/app/account/page.tsx', accountStr);
