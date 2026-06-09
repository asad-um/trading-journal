const fs = require('fs');

const authImports = `import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';`;

const authCheck = `    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() }
        }
      }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }`;

// 1. sign-cloudinary
let signApi = fs.readFileSync('src/app/api/sign-cloudinary/route.ts', 'utf8');
if (!signApi.includes('createServerClient')) {
    signApi = signApi.replace("import { v2 as cloudinary } from 'cloudinary';", "import { v2 as cloudinary } from 'cloudinary';\n" + authImports);
    signApi = signApi.replace("try {", "try {\n" + authCheck);
    fs.writeFileSync('src/app/api/sign-cloudinary/route.ts', signApi);
}

// 2. delete-image
let delApi = fs.readFileSync('src/app/api/delete-image/route.ts', 'utf8');
if (!delApi.includes('createServerClient')) {
    delApi = delApi.replace("import { v2 as cloudinary } from 'cloudinary';", "import { v2 as cloudinary } from 'cloudinary';\n" + authImports);
    delApi = delApi.replace("try {", "try {\n" + authCheck);
    fs.writeFileSync('src/app/api/delete-image/route.ts', delApi);
}

// 3. delete-images-bulk
let bulkApi = fs.readFileSync('src/app/api/delete-images-bulk/route.ts', 'utf8');
if (!bulkApi.includes('createServerClient')) {
    bulkApi = bulkApi.replace("import { v2 as cloudinary } from 'cloudinary';", "import { v2 as cloudinary } from 'cloudinary';\n" + authImports);
    bulkApi = bulkApi.replace("try {", "try {\n" + authCheck);
    fs.writeFileSync('src/app/api/delete-images-bulk/route.ts', bulkApi);
}

console.log("APIs secured.");
