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
    const { public_id } = await req.json();

    if (!public_id) {
      return NextResponse.json({ error: "Missing public_id" }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: "CLOUDINARY_API_SECRET missing in environment variables. Cannot authenticate delete request." }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(public_id, { invalidate: true });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary rejected deletion: ${result.result}`);
    }
    
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message || "Failed to delete image" }, { status: 500 });
  }
}
