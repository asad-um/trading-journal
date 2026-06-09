const fs = require('fs');
let content = fs.readFileSync('src/app/trades/page.tsx', 'utf8');

const oldEffectEnd = `    }
    fetchTrades();
  }, [toast]);`;

const newEffectEnd = `    }
    fetchTrades();

    const channel = supabase.channel('realtime-trades')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => fetchTrades())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'portfolios' }, () => fetchTrades())
      .subscribe();

    return () => { supabase.removeChannel(channel); }
  }, [toast]);`;

if (content.includes(oldEffectEnd)) {
    content = content.replace(oldEffectEnd, newEffectEnd);
    fs.writeFileSync('src/app/trades/page.tsx', content);
    console.log("Realtime added to trades/page.tsx");
}
