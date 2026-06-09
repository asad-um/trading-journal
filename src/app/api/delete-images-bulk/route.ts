import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const cookieStore = cookies();
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
    }
    const { public_ids } = await req.json();

    if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
      return NextResponse.json({ success: true, message: "No images to delete" });
    }

    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "CLOUDINARY_API_SECRET missing. Cannot authenticate bulk delete request." }, { status: 400 });
    }

    // Cloudinary admin API for bulk deletion
    const result = await cloudinary.api.delete_resources(public_ids);
    
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message || "Failed to delete images" }, { status: 500 });
  }
}
