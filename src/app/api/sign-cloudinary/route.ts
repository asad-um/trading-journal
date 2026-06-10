import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET() {
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
    const timestamp = Math.round(new Date().getTime() / 1000);
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!apiSecret) {
      console.error("[sign-cloudinary] API secret not configured");
      return NextResponse.json({ error: "Image upload service temporarily unavailable" }, { status: 503 });
    }

    const signature = cloudinary.utils.api_sign_request(
      { timestamp },
      apiSecret
    );

    return NextResponse.json({ timestamp, signature });
  } catch {
    return NextResponse.json({ error: "Failed to generate signature" }, { status: 500 });
  }
}
