import { NextRequest, NextResponse } from "next/server";
import { getWorkflow, updateWorkflow } from "@/lib/agent/workflows";
import { createRoom, addRoomParticipant, getRoomMessages } from "@/lib/band/server";

/**
 * POST /api/band/workflow-room
 *
 * Gets the existing Band room for a workflow, or creates one if none exists.
 * When creating: adds all 4 agents (orchestrator, scout, risk_monitor, executor)
 * as participants so they auto-receive messages.
 *
 * Body: { workflowId: string }
 *
 * Returns: { roomId: string, created: boolean }
 */
export async function POST(req: NextRequest) {
  try {
    const { workflowId } = (await req.json()) as { workflowId: string };
    if (!workflowId) {
      return NextResponse.json({ error: "workflowId required" }, { status: 400 });
    }

    // Check if workflow already has a Band room
    const wf = await getWorkflow(workflowId);
    if (!wf) {
      return NextResponse.json({ error: "Workflow not found" }, { status: 404 });
    }

    if (wf.bandRoomId) {
      // Room already exists — just return it
      try {
        const msgs = await getRoomMessages(wf.bandRoomId, { page: 1, pageSize: 1 });
        if (msgs.length >= 0) {
          return NextResponse.json({ roomId: wf.bandRoomId, created: false });
        }
      } catch {
        // Room may have been deleted — fall through to create a new one
        console.warn(`[band/workflow-room] Existing room ${wf.bandRoomId} not reachable, creating new`);
      }
    }

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

    const orchKey = agentApiKeys.orchestrator;
    if (!orchKey || !agentIds.orchestrator) {
      // No Band configured — just return null, the frontend will handle gracefully
      return NextResponse.json({ roomId: null, error: "Band not configured" });
    }

    // Create the room
    const roomId = await createRoom(orchKey);
    console.log(`[band/workflow-room] Created room ${roomId} for workflow ${workflowId}`);

    // Add agents as participants
    for (const [role, agentId] of Object.entries(agentIds)) {
      if (!agentId || role === "orchestrator") continue;
      const apiKey = agentApiKeys[role];
      if (!apiKey) continue;
      try {
        await addRoomParticipant(roomId, agentId, "member", { key: apiKey });
      } catch (e) {
        console.warn(`[band/workflow-room] Failed to add ${role}: ${e instanceof Error ? e.message : e}`);
      }
    }

    // Store the room ID on the workflow
    await updateWorkflow(workflowId, { bandRoomId: roomId });

    return NextResponse.json({ roomId, created: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[band/workflow-room] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
