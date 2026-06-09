import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // 1. Force Authentication. We do not accept anonymous crash logs to prevent database spam.
    const cookieStore = cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() }
        }
      }
    );

    const { data: { user } } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { error_name, error_message, error_stack, route } = body;
    
    // 2. Strict Payload Limits (Prevent DB overflow attacks)
    const cleanName = String(error_name || 'Unknown').substring(0, 100);
    const cleanMsg = String(error_message || 'Unknown').substring(0, 500);
    const cleanStack = String(error_stack || 'No stack').substring(0, 2000);
    const cleanRoute = String(route || '/').substring(0, 100);

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
       return NextResponse.json({ error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }

    // 3. Bypass RLS to insert into the system_logs table
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    await supabaseAdmin.from('system_logs').insert({
      user_id: user.id,
      error_name: cleanName,
      error_message: cleanMsg,
      error_stack: cleanStack,
      route: cleanRoute
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
