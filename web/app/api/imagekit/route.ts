import ImageKit from "@imagekit/nodejs";
import { NextResponse } from "next/server";

const imagekit = new ImageKit({
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
});

export async function GET() {
  try {
    const authParams = imagekit.helper.getAuthenticationParameters();
    return NextResponse.json(authParams);
  } catch (error) {
    return NextResponse.json({ error: "Failed to generate auth" }, { status: 500 });
  }
}
