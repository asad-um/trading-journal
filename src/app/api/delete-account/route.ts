import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { v2 as cloudinary } from 'cloudinary';
import { checkRateLimit } from '@/lib/rate-limit';

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
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => cookieStore.set(name, value))
          },
        },
      }
    );

    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(`delete-account:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
       console.error("[delete-account] Service role key not configured");
       return NextResponse.json({ error: "Account deletion service temporarily unavailable" }, { status: 503 });
    }

    // Initialize Admin Supabase Client to bypass RLS and delete the Auth User
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch all trades to delete Cloudinary images
    const { data: trades } = await adminSupabase.from('trades').select('pre_trade_images, post_trade_images').eq('user_id', user.id);
    
    if (trades && process.env.CLOUDINARY_API_SECRET) {
      const publicIds: string[] = [];
      trades.forEach(trade => {
        if (trade.pre_trade_images) {
          trade.pre_trade_images.forEach((img: { public_id?: string }) => img.public_id && publicIds.push(img.public_id));
        }
        if (trade.post_trade_images) {
          trade.post_trade_images.forEach((img: { public_id?: string }) => img.public_id && publicIds.push(img.public_id));
        }
      });

      if (publicIds.length > 0) {
        // Delete in chunks of 100 (Cloudinary API limit per request)
        for (let i = 0; i < publicIds.length; i += 100) {
          const chunk = publicIds.slice(i, i + 100);
          await cloudinary.api.delete_resources(chunk).catch(console.error);
        }
      }
    }

    // 2. Delete the user from Auth. This cascades to profiles, portfolios, trades, etc.
    const { error: deleteError } = await adminSupabase.auth.admin.deleteUser(user.id);
    
    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
