import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { public_id } = await req.json();

    if (!public_id) {
      return NextResponse.json({ error: "Missing public_id" }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ success: false, message: "Garbage collection skipped (No API Secret)" });
    }

    const result = await cloudinary.uploader.destroy(public_id);
    
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message || "Failed to delete image" }, { status: 500 });
  }
}
