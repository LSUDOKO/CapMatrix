import { NextRequest, NextResponse } from "next/server";
import { createRoom, addRoomParticipant } from "@/lib/band/server";

/**
 * POST /api/band/create-room
 *
 * Creates a Band chat room for a workflow and adds all 4 agents
 * (orchestrator, scout, risk_monitor, executor) as participants.
 * Uses each agent's own API key so they auto-join the room.
 *
 * Body: { workflowId?: string, workflowName?: string }
 *
 * Returns: { roomId: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { workflowName } = (await req.json()) as {
      workflowId?: string;
      workflowName?: string;
    };

    // Read agent credentials from env
    const agentApiKeys: Record<string, string> = {
      orchestrator: process.env.BAND_ORCHESTRATOR_KEY ?? "",
      scout:        process.env.BAND_SCOUT_KEY ?? "",
      risk_monitor: process.env.BAND_RISK_MONITOR_KEY ?? "",
      executor:     process.env.BAND_EXECUTOR_KEY ?? "",
    };

    const agentIds: Record<string, string> = {
      orchestrator: process.env.BAND_ORCHESTRATOR_ID ?? "",
      scout:        process.env.BAND_SCOUT_ID ?? "",
      risk_monitor: process.env.BAND_RISK_MONITOR_ID ?? "",
      executor:     process.env.BAND_EXECUTOR_ID ?? "",
    };

    // Need at least the orchestrator to create the room
    const orchKey = agentApiKeys.orchestrator;
    const orchId  = agentIds.orchestrator;
    if (!orchKey || !orchId) {
      return NextResponse.json(
        { error: "Band orchestrator not configured. Set BAND_ORCHESTRATOR_KEY and BAND_ORCHESTRATOR_ID." },
        { status: 400 },
      );
    }

    // Step 1: Create the room
    const roomId = await createRoom(orchKey);
    console.log(`[band/create-room] Created room ${roomId}${workflowName ? ` (${workflowName})` : ""}`);

    // Step 2: Add each agent as a participant (skip orchestrator — already the owner/creator)
    for (const [role, agentId] of Object.entries(agentIds)) {
      if (!agentId) continue;
      if (role === "orchestrator") continue; // already in room as creator
      const apiKey = agentApiKeys[role];
      if (!apiKey) {
        console.warn(`[band/create-room] No API key for ${role}, skipping participant add`);
        continue;
      }
      await addRoomParticipant(roomId, agentId, "member", { key: apiKey });
      console.log(`[band/create-room] Added ${role} (${agentId.slice(0, 8)}...) to room ${roomId}`);
    }

    return NextResponse.json({ roomId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[band/create-room] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
