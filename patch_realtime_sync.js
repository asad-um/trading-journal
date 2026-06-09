const fs = require('fs');

// We are going to inject Supabase Realtime listeners into the 4 main data pages.
// We will modify `fetchData` to accept a `silent` parameter so the screen doesn't 
// flash a loading spinner when a background update arrives from another device.

function injectRealtime(filePath, tables) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. Modify fetchData to accept a silent param
    // Some files have `setIsLoading(true);` right inside the function, some before.
    if (content.includes('async function fetchData() {') && content.includes('setIsLoading(true);')) {
        content = content.replace('async function fetchData() {', 'async function fetchData(silent: boolean = false) {');
        content = content.replace('setIsLoading(true);', 'if (!silent) setIsLoading(true);');
    }
    
    // 2. Inject the channel subscription at the end of the useEffect
    // We look for the exact end of the useEffect block.
    const oldEffectEnd = 'fetchData();\n  }, [';
    
    let channelString = `\n      const channel = supabase.channel('realtime-${filePath.split('/').pop()}')\n`;
    tables.forEach(table => {
        channelString += `        .on('postgres_changes', { event: '*', schema: 'public', table: '${table}' }, () => fetchData(true))\n`;
    });
    channelString += `        .subscribe();\n\n      return () => { supabase.removeChannel(channel); }\n  }, [`;

    if (content.includes(oldEffectEnd)) {
        content = content.replace(oldEffectEnd, channelString);
    } else {
        // Fallback for files that don't match the exact pattern
        content = content.replace('fetchData();\n  }, []);', channelString.replace('}, [', '}, []);'));
    }

    fs.writeFileSync(filePath, content);
    console.log(`Realtime injected into: ${filePath}`);
}

try { injectRealtime('src/app/dashboard/page.tsx', ['trades', 'portfolios']); } catch(e){ console.error(e) }
try { injectRealtime('src/app/statistics/page.tsx', ['trades', 'portfolios']); } catch(e){ console.error(e) }
try { injectRealtime('src/app/account/page.tsx', ['account_events', 'portfolios']); } catch(e){ console.error(e) }
try { injectRealtime('src/app/trades/page.tsx', ['trades', 'portfolios']); } catch(e){ console.error(e) }

