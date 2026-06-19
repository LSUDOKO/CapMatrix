import { NextRequest, NextResponse } from "next/server";
import { listRooms } from "@/lib/band/server";

export async function GET(_req: NextRequest) {
  try {
    const rooms = await listRooms();
    return NextResponse.json({ rooms });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
