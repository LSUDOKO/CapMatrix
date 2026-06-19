import { NextRequest, NextResponse } from "next/server";
import { getRoomMessages, sendMessage, getParticipants } from "@/lib/band/server";

export async function GET(req: NextRequest) {
  try {
    const roomId = req.nextUrl.searchParams.get("roomId");
    if (!roomId) return NextResponse.json({ error: "roomId required" }, { status: 400 });
    const page = Number(req.nextUrl.searchParams.get("page") ?? "1");
    const msgs = await getRoomMessages(roomId, { page, pageSize: 100 });
    return NextResponse.json({ messages: msgs });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { roomId, content } = (await req.json()) as {
      roomId?: string;
      content?: string;
    };
    if (!roomId || !content) {
      return NextResponse.json({ error: "roomId and content required" }, { status: 400 });
    }

    // Mention all registered agents so they receive the message
    const agentIds = [
      process.env.BAND_ORCHESTRATOR_ID ?? "",
      process.env.BAND_SCOUT_ID ?? "",
      process.env.BAND_RISK_MONITOR_ID ?? "",
      process.env.BAND_EXECUTOR_ID ?? "",
    ].filter((id): id is string => !!id);

    const msg = await sendMessage(roomId, content, agentIds);
    return NextResponse.json({ message: msg });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
