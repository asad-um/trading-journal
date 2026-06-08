const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// The issue with the form being slow is the use of `useWatch` firing on every single keystroke 
// and triggering a re-render of the entire massive form component.
// We can optimize this by removing granular watches that aren't strictly necessary 
// for UI rendering, or restructuring how they are used.

// Let's debounce the local storage auto-save which also causes massive re-renders.
const oldAutoSave = `  // Auto-save draft on form change (debounced safely via watch in useEffect)
  useEffect(() => {
    if (initialData?.id || isLoading) return; // Don't draft edits, only new trades
    
    const subscription = form.watch((value) => {
      const draft = { ...value, _timestamp: Date.now() };
      localStorage.setItem('trade_draft', JSON.stringify(draft));
    });
    return () => subscription.unsubscribe();
  }, [form, initialData, isLoading]);`;

const newAutoSave = `  // Auto-save draft on form change with a strict debounce to prevent UI lag
  useEffect(() => {
    if (initialData?.id || isLoading) return;
    
    let timeoutId: NodeJS.Timeout;
    const subscription = form.watch((value) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const draft = { ...value, _timestamp: Date.now() };
        localStorage.setItem('trade_draft', JSON.stringify(draft));
      }, 1000); // 1-second debounce prevents lag on typing
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [form, initialData, isLoading]);`;

content = content.replace(oldAutoSave, newAutoSave);

fs.writeFileSync('src/components/trades/trade-form.tsx', content);
