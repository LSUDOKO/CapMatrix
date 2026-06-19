import { NextRequest, NextResponse } from "next/server";
import { createRoom, addRoomParticipant, sendMessage, getParticipants } from "@/lib/band/server";
import { getWorkflow, updateWorkflow } from "@/lib/agent/workflows";

/**
 * POST /api/band/seeded-room
 *
 * Creates a Band chat room for a workflow and pre-seeds it with initial
 * context messages showing the workflow goal, agent roles, and the
 * delegated budget. All 4 agents (orchestrator, scout, risk_monitor,
 * executor) are added as participants.
 *
 * Body: { workflowId: string, workflowName?: string }
 *
 * Returns: { roomId: string, created: boolean, participantCount: number }
 */
export async function POST(req: NextRequest) {
  try {
    const { workflowId, workflowName } = (await req.json()) as {
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

    const agentNames: Record<string, string> = {
      orchestrator: "Orchestrator",
      scout:        "Scout",
      risk_monitor: "Risk Monitor",
      executor:     "Executor",
    };

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
    const name = workflowName ?? (workflowId ? `Workflow ${workflowId.slice(0, 8)}` : "CapMatrix Agents");
    console.log(`[band/seeded-room] Created room ${roomId} (${name})`);

    // Step 2: Add each agent as a participant
    let participantCount = 1; // orchestrator is already the creator
    for (const [role, agentId] of Object.entries(agentIds)) {
      if (!agentId) continue;
      if (role === "orchestrator") continue;
      const apiKey = agentApiKeys[role];
      if (!apiKey) {
        console.warn(`[band/seeded-room] No API key for ${role}, skipping`);
        continue;
      }
      try {
        await addRoomParticipant(roomId, agentId, "member", { key: apiKey });
        participantCount++;
        console.log(`[band/seeded-room] Added ${role} (${agentId.slice(0, 8)}...)`);
      } catch (e) {
        console.warn(`[band/seeded-room] Failed to add ${role}: ${e}`);
      }
    }

    // Step 3: Load workflow context if we have a workflowId
    let workflowPrompt = "";
    let workflowBudget = "10";
    if (workflowId) {
      try {
        const wf = await getWorkflow(workflowId);
        if (wf) {
          workflowPrompt = wf.prompt;
          workflowBudget = wf.budgetUsdc;
        }
      } catch { /* non-fatal */ }
    }

    // Step 4: Pre-seed context messages (sent as the orchestrator)
    const introMsgs: string[] = [
      `🧠 **Workflow initialized**: ${name}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      workflowPrompt
        ? `📋 **Goal**: ${workflowPrompt}`
        : `📋 **Goal**: Automate DeFi strategy on Base mainnet`,
      `💰 **Budget**: ${workflowBudget} USDC (on-chain capped)`,
      `⛓️ **Network**: Base Mainnet (chain ID: 8453)`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `**Agent roster:**`,
      `🔭 **@Scout** — Intelligence gathering (yields, whales, convergence)`,
      `🛡️ **@RiskMonitor** — Risk evaluation, veto power, security checks`,
      `⚡ **@Executor** — DeFi execution, copy trades, portfolio rebalancing`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `✅ Room is live. Agents will respond when their role is called.`,
      `Use @mentions to trigger specific agents.`,
    ]
    .filter(Boolean);

    for (const content of introMsgs) {
      try {
        await sendMessage(roomId, content, [], { key: orchKey });
      } catch { /* non-fatal per message */ }
    }

    // Step 5: Store the room ID on the workflow
    if (workflowId) {
      try {
        await updateWorkflow(workflowId, { bandRoomId: roomId });
      } catch { /* non-fatal */ }
    }

    return NextResponse.json({
      roomId,
      created: true,
      participantCount,
      name,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[band/seeded-room] Error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
