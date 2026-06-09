const fs = require('fs');

const pages = [
  'src/app/dashboard/page.tsx',
  'src/app/statistics/page.tsx',
  'src/app/account/page.tsx',
  'src/app/trades/page.tsx'
];

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  
  // The regex to find the end of fetchData definition and the start of the realtime channel
  // We need to inject `fetchData();` between them if it's missing.
  
  if (content.includes('const channel = supabase.channel') && !content.includes('fetchData();\\n      const channel')) {
     content = content.replace(
       /    \}\n\n      const channel = supabase\.channel/g,
       '    }\n    fetchData();\n      const channel = supabase.channel'
     );
     content = content.replace(
       /    \}\n      const channel = supabase\.channel/g,
       '    }\n    fetchData();\n      const channel = supabase.channel'
     );
     fs.writeFileSync(file, content);
     console.log('Fixed loading bug in:', file);
  }
});
