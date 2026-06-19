import { NextRequest, NextResponse } from "next/server";
import { getRoomMessages, getParticipants, listRooms } from "@/lib/band/server";
import { getDb } from "@/lib/db/mongodb";

/**
 * GET /api/band/room-detail?roomId=xxx
 *
 * Returns full room detail including messages and participants.
 * This is the primary endpoint for the Band room detail page.
 */
export async function GET(req: NextRequest) {
  try {
    const roomId = req.nextUrl.searchParams.get("roomId");
    if (!roomId) {
      return NextResponse.json({ error: "roomId is required" }, { status: 400 });
    }

    // Fetch messages and participants in parallel
    const [messages, participants] = await Promise.all([
      getRoomMessages(roomId, { page: 1, pageSize: 200 }).catch(() => []),
      getParticipants(roomId).catch(() => []),
    ]);

    // Find the room name from the rooms list
    let roomName: string | null = null;
    try {
      const rooms = await listRooms();
      const room = rooms.find((r) => r.id === roomId);
      if (room) roomName = room.name;
    } catch { /* non-fatal */ }

    // Look up which workflow owns this room (from DB bandRoomId field)
    let workflowId: string | null = null;
    try {
      const db = await getDb();
      if (db) {
        const wf = await db.collection<{ id: string; bandRoomId?: string }>("workflows_v2").findOne({ bandRoomId: roomId }, { projection: { id: 1 } });
        if (wf) workflowId = wf.id;
      }
    } catch { /* non-fatal */ }

    // Categorize messages by sender type for the frontend
    const agentMessages = messages.filter((m) => m.senderType === "Agent");
    const userMessages = messages.filter((m) => m.senderType === "User");

    // Extract execution-related messages (contain tx hashes or execution results)
    const executionMessages = messages.filter((m) => {
      const c = m.content.toLowerCase();
      return (
        c.includes("0x") ||
        c.includes("tx hash") ||
        c.includes("executed") ||
        c.includes("transaction") ||
        c.includes("basescan") ||
        c.includes("deployed") ||
        c.includes("contract") ||
        c.includes("deposit") ||
        c.includes("swap") ||
        c.includes("transfer")
      );
    });

    return NextResponse.json({
      workflowId,
      room: {
        id: roomId,
        name: roomName,
        messageCount: messages.length,
        agentCount: participants.filter((p) => p.type === "Agent").length,
        userCount: participants.filter((p) => p.type === "User").length,
      },
      messages,
      participants,
      stats: {
        totalMessages: messages.length,
        agentMessages: agentMessages.length,
        userMessages: userMessages.length,
        executionMessages: executionMessages.length,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[band/room-detail] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
