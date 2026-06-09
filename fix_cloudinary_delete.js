const fs = require('fs');

// 1. Update /api/delete-image/route.ts
let deleteSingle = fs.readFileSync('src/app/api/delete-image/route.ts', 'utf8');

const oldSingleFailsafe = `    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ success: false, message: "Garbage collection skipped (No API Secret)" });
    }`;

const newSingleFailsafe = `    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "CLOUDINARY_API_SECRET missing in environment variables. Cannot authenticate delete request." }, { status: 400 });
    }`;

const oldSingleDestroy = `const result = await cloudinary.uploader.destroy(public_id);`;
const newSingleDestroy = `const result = await cloudinary.uploader.destroy(public_id, { invalidate: true });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(\`Cloudinary rejected deletion: \${result.result}\`);
    }`;

deleteSingle = deleteSingle.replace(oldSingleFailsafe, newSingleFailsafe);
deleteSingle = deleteSingle.replace(oldSingleDestroy, newSingleDestroy);
fs.writeFileSync('src/app/api/delete-image/route.ts', deleteSingle);

// 2. Update /api/delete-images-bulk/route.ts
let deleteBulk = fs.readFileSync('src/app/api/delete-images-bulk/route.ts', 'utf8');

const oldBulkFailsafe = `    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ success: false, message: "Garbage collection skipped (No API Secret)" });
    }`;

const newBulkFailsafe = `    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "CLOUDINARY_API_SECRET missing. Cannot authenticate bulk delete request." }, { status: 400 });
    }`;

deleteBulk = deleteBulk.replace(oldBulkFailsafe, newBulkFailsafe);
fs.writeFileSync('src/app/api/delete-images-bulk/route.ts', deleteBulk);

console.log("Backend delete APIs hardened.");
