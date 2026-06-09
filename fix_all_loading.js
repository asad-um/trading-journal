const fs = require('fs');

function fixFile(filePath, fetchFuncName) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (filePath.includes('account/page.tsx')) {
    // For account page, fetchData is OUTSIDE useEffect
    if (!content.includes('fetchData();\\n      const channel = supabase.channel')) {
        content = content.replace(
            "const channel = supabase.channel('realtime-page.tsx')",
            "fetchData();\n      const channel = supabase.channel('realtime-page.tsx')"
        );
    }
  } else {
    // For dashboard and statistics, fetchData is INSIDE useEffect
    if (!content.includes('fetchData();\\n      const channel = supabase.channel')) {
        content = content.replace(
            "const channel = supabase.channel('realtime-page.tsx')",
            "fetchData();\n      const channel = supabase.channel('realtime-page.tsx')"
        );
    }
  }

  fs.writeFileSync(filePath, content);
  console.log('Fixed', filePath);
}

fixFile('src/app/dashboard/page.tsx', 'fetchData');
fixFile('src/app/statistics/page.tsx', 'fetchData');
fixFile('src/app/account/page.tsx', 'fetchData');

