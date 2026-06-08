import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const { public_ids } = await req.json();

    if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
      return NextResponse.json({ success: true, message: "No images to delete" });
    }

    if (!process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ success: false, message: "Garbage collection skipped (No API Secret)" });
    }

    // Cloudinary admin API for bulk deletion
    const result = await cloudinary.api.delete_resources(public_ids);
    
    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message || "Failed to delete images" }, { status: 500 });
  }
}
