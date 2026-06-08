import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

export async function GET() {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!apiSecret) {
      return NextResponse.json({ error: "CLOUDINARY_API_SECRET not set" }, { status: 500 });
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
