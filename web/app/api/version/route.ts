import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    // Read version.json from the root directory
    const versionPath = path.join(process.cwd(), "..", "version.json");
    const versionData = JSON.parse(fs.readFileSync(versionPath, "utf8"));
    return NextResponse.json(versionData);
  } catch (error) {
    // Fallback: try reading from alternative path
    try {
      const altPath = path.join(process.cwd(), "version.json");
      const versionData = JSON.parse(fs.readFileSync(altPath, "utf8"));
      return NextResponse.json(versionData);
    } catch {
      return NextResponse.json(
        {
          latestVersion: "1.0.0",
          downloadUrl: "#",
          error: "Version file not found",
        },
        { status: 500 }
      );
    }
  }
}
