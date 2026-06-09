const fs = require('fs');

// 1. Fix Registration Toast
let register = fs.readFileSync('src/app/register/page.tsx', 'utf8');
register = register.replace(
  'toast({ title: "Welcome!", description: "Your account has been created and defaults seeded." });',
  'toast({ title: "Account Created", description: "Your account is ready. Please check your email to verify your registration." });'
);
fs.writeFileSync('src/app/register/page.tsx', register);

// 2. Fix Dashboard "View Full Log" Overlap
let dashboard = fs.readFileSync('src/app/dashboard/page.tsx', 'utf8');
dashboard = dashboard.replace(
  '<div className="flex justify-between items-center w-full">',
  '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-3 sm:gap-0">'
);
dashboard = dashboard.replace(
  '<TabsList className="bg-background-tertiary">',
  '<TabsList className="bg-background-tertiary flex-wrap h-auto">'
);
fs.writeFileSync('src/app/dashboard/page.tsx', dashboard);

// 3. Fix Settings "Danger Zone" Overlap
let settings = fs.readFileSync('src/app/settings/page.tsx', 'utf8');
settings = settings.replace(
  '<div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:bg-loss/5 transition-colors">',
  '<div className="flex flex-col justify-between p-5 gap-4 hover:bg-loss/5 transition-colors">'
);
settings = settings.replace(
  '<div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4 hover:bg-loss/10 transition-colors">',
  '<div className="flex flex-col justify-between p-5 gap-4 hover:bg-loss/10 transition-colors">'
);
fs.writeFileSync('src/app/settings/page.tsx', settings);

// 4. Fix Toast massive padding
let toast = fs.readFileSync('src/components/ui/toast.tsx', 'utf8');
toast = toast.replace(
  'p-6 pr-8',
  'p-4 pr-6 sm:p-6 sm:pr-8' // Smaller padding on mobile, default on desktop
);
toast = toast.replace(
  'text-sm opacity-90',
  'text-xs sm:text-sm opacity-90'
);
fs.writeFileSync('src/components/ui/toast.tsx', toast);

