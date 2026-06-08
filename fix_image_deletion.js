const fs = require('fs');

let form = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

// The user is currently deleting images from the UI array with `removeImage`.
// However, this leaves the actual file sitting in Cloudinary forever, eating up their storage space.
// We must ping our new API route to securely destroy the physical file.

const oldRemove = `  const removeImage = (index: number, type: 'pre' | 'post') => {
    const fieldName = type === 'pre' ? 'pre_trade_images' : 'post_trade_images';
    const currentImages = form.getValues(fieldName) || [];
    const newImages = [...currentImages];
    newImages.splice(index, 1);
    form.setValue(fieldName, newImages);
  };`;

const newRemove = `  const removeImage = async (index: number, type: 'pre' | 'post') => {
    const fieldName = type === 'pre' ? 'pre_trade_images' : 'post_trade_images';
    const currentImages = form.getValues(fieldName) || [];
    const imageToDelete = currentImages[index];
    
    // Optimistically update the UI instantly
    const newImages = [...currentImages];
    newImages.splice(index, 1);
    form.setValue(fieldName, newImages, { shouldDirty: true });

    // Send garbage collection request to backend to physically destroy the Cloudinary file
    if (imageToDelete && imageToDelete.public_id) {
      try {
        await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: imageToDelete.public_id })
        });
      } catch (e) {
        console.error("Garbage collection failed:", e);
      }
    }
  };`;

form = form.replace(oldRemove, newRemove);
fs.writeFileSync('src/components/trades/trade-form.tsx', form);

// Also need to handle Trade deletion from the Logs page!
let tradeLog = fs.readFileSync('src/app/trades/page.tsx', 'utf8');
const oldDelete = `  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    const { error } = await supabase.from("trades").delete().eq("id", id);`;

const newDelete = `  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this trade?")) return;
    
    // First, fetch the trade to see if it has images attached that need to be destroyed
    const { data: tradeData } = await supabase.from("trades").select("pre_trade_images, post_trade_images").eq("id", id).single();
    
    const { error } = await supabase.from("trades").delete().eq("id", id);
    
    // If deletion succeeded, trigger asynchronous garbage collection for Cloudinary
    if (!error && tradeData) {
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
    }`;

tradeLog = tradeLog.replace(oldDelete, newDelete);
fs.writeFileSync('src/app/trades/page.tsx', tradeLog);

