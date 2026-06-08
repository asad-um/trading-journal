const fs = require('fs');

let content = fs.readFileSync('src/components/trades/trade-form.tsx', 'utf8');

const oldImageLogic = `const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({ title: "Upload Failed", description: "Cloudinary keys missing from .env.local", variant: "destructive" });
      return;
    }

    if (type === 'pre') { setIsUploadingPre(true); } else { setIsUploadingPost(true); }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);

      const response = await fetch(\`https://api.cloudinary.com/v1_1/\${cloudName}/image/upload\`, {
        method: 'POST',
        body: formData,
      });`;

const newImageLogic = `const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    
    if (!cloudName) {
      toast({ title: "Upload Failed", description: "Cloudinary Cloud Name missing from .env.local", variant: "destructive" });
      return;
    }

    if (type === 'pre') { setIsUploadingPre(true); } else { setIsUploadingPost(true); }

    try {
      const formData = new FormData();
      formData.append('file', file);

      // We attempt a secure signed upload first via our Next.js API route
      // If the user hasn't set up the API Secret, we gracefully fallback to the unsigned preset.
      const signRes = await fetch('/api/sign-cloudinary');
      const signData = await signRes.json();

      if (signRes.ok && signData.signature) {
        formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || '');
        formData.append('timestamp', signData.timestamp);
        formData.append('signature', signData.signature);
      } else {
        const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
        if (!uploadPreset) throw new Error("Missing both Secure API signature and Unsigned Upload Preset");
        formData.append('upload_preset', uploadPreset);
      }

      const response = await fetch(\`https://api.cloudinary.com/v1_1/\${cloudName}/image/upload\`, {
        method: 'POST',
        body: formData,
      });`;

content = content.replace(oldImageLogic, newImageLogic);
fs.writeFileSync('src/components/trades/trade-form.tsx', content);

