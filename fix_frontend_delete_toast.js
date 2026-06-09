const fs = require('fs');

let tradesPage = fs.readFileSync('src/app/trades/page.tsx', 'utf8');

const oldFrontendDelete = `      allImages.forEach(img => {
        if (img && img.public_id) {
          fetch('/api/delete-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ public_id: img.public_id })
          }).catch(console.error);
        }
      });`;

const newFrontendDelete = `      allImages.forEach(async (img) => {
        if (img && img.public_id) {
          try {
            const res = await fetch('/api/delete-image', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ public_id: img.public_id })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
          } catch (e: any) {
            console.error(e);
            toast({ title: "Image Cleanup Warning", description: e.message || "Failed to delete image from Cloudinary.", variant: "warning" });
          }
        }
      });`;

tradesPage = tradesPage.replace(oldFrontendDelete, newFrontendDelete);
fs.writeFileSync('src/app/trades/page.tsx', tradesPage);

let tradeForm = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

const oldRemoveImage = `    // Send garbage collection request to backend to physically destroy the Cloudinary file
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
    }`;

const newRemoveImage = `    // Send garbage collection request to backend to physically destroy the Cloudinary file
    if (imageToDelete && imageToDelete.public_id) {
      try {
        const res = await fetch('/api/delete-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ public_id: imageToDelete.public_id })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
      } catch (e: any) {
        console.error("Garbage collection failed:", e);
        toast({ title: "Image Cleanup Warning", description: e.message || "Failed to delete image from Cloudinary.", variant: "warning" });
      }
    }`;

tradeForm = tradeForm.replace(oldRemoveImage, newRemoveImage);
fs.writeFileSync('src/components/trades/trade-form.tsx', tradeForm);

console.log("Frontend UI connected to strict deletion feedback.");
