const fs = require('fs');

let settings = fs.readFileSync('src/app/settings/page.tsx', 'utf8');

settings = settings.replace(/\(img: any\)/g, '(img: { public_id?: string })');
settings = settings.replace(/catch \(error: any\)/g, 'catch (error: unknown)');
settings = settings.replace(/error\.message/g, '(error as Error).message');

fs.writeFileSync('src/app/settings/page.tsx', settings);
