const fs = require('fs');
let content = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

// Replace the old tabs list in settings with a cleaner SaaS design
content = content.replace(
  '<TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b border-border rounded-none p-0 h-auto flex-wrap">',
  '<TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 space-x-8 overflow-x-auto flex-nowrap md:flex-wrap">'
);

content = content.replace(/className="data-\[state=active\]:bg-transparent data-\[state=active\]:border-b-2 data-\[state=active\]:border-accent rounded-none pb-2"/g, 'className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none pb-3 px-1 font-medium text-text-muted data-[state=active]:text-foreground whitespace-nowrap"');
content = content.replace(/className="data-\[state=active\]:bg-transparent data-\[state=active\]:border-b-2 data-\[state=active\]:border-accent rounded-none pb-2 text-loss data-\[state=active\]:text-loss"/g, 'className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-loss rounded-none pb-3 px-1 font-medium text-loss data-[state=active]:text-loss whitespace-nowrap"');

// Header revamp
content = content.replace(
  '<h1 className="text-2xl font-bold">Settings</h1>',
  `<div className="flex flex-col space-y-1 mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
          <p className="text-text-muted">Manage your workspace preferences, playbooks, and exports.</p>
        </div>`
);

fs.writeFileSync('src/app/settings/page.tsx', content);
