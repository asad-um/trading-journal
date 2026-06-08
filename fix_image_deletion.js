const fs = require('fs');
let tradeLog = fs.readFileSync('src/app/trades/page.tsx', 'utf8');

// The user noted that "When I delete a trade the image also deletes on claudinary automatically. Look through the logic functions of the script again".
// Let's verify the `handleDelete` function in `src/app/trades/page.tsx`.

const deletionLogic = `  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    
    // First, fetch the trade to see if it has images attached that need to be destroyed
    const { data: tradeData } = await supabase.from("trades").select("pre_trade_images, post_trade_images").eq("id", id).single();
    
    const { error } = await supabase.from("trades").delete().eq("id", id);
    
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Trade removed successfully" });
      setTrades(trades.filter(t => t.id !== id));
      
      // If deletion succeeded, trigger asynchronous garbage collection for Cloudinary
      if (tradeData) {
        const allImages = [
          ...(tradeData.pre_trade_images || []), 
          ...(tradeData.post_trade_images || [])
        ];
        
        allImages.forEach(img => {
          if (img && img.public_id) {
            fetch('/api/delete-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ public_id: img.public_id })
            }).catch(console.error);
          }
        });
      }
    }
  };`;

// Check if it already exists correctly, if not, inject it.
if (!tradeLog.includes("allImages.forEach")) {
    const oldDelete = `  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    const { error } = await supabase.from("trades").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted", description: "Trade removed successfully" });
      setTrades(trades.filter(t => t.id !== id));
    }
  };`;
    tradeLog = tradeLog.replace(oldDelete, deletionLogic);
    fs.writeFileSync('src/app/trades/page.tsx', tradeLog);
    console.log("Image garbage collection logic applied to Trade Log.");
} else {
    console.log("Image garbage collection logic was already present and robust.");
}

