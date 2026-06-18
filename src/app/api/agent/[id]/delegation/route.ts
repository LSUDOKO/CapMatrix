import { NextRequest, NextResponse } from "next/server";
import { getAgent } from "@/lib/agent/agents";
import { decodeDelegations } from "@metamask/smart-accounts-kit/utils";
import { getSmartAccountsEnvironment } from "@metamask/smart-accounts-kit";

/**
 * #5 — make the agent visibly on-chain.
 *
 * Decodes the agent's stored `delegationContext` (the ERC-7710 chain it redeems
 * through) into its real hops: user → session → THIS AGENT (capped) → relayer.
 * The frontend renders this so the agent's on-chain role is visible, with the
 * scoped hash linkable to Basescan.
 *
 * It also extracts the ERC20TransferAmount cap enforced at EACH hop, so the UI
 * can show authority *narrowing* down the chain (each hop re-signs with a
 * smaller cap; a child with no explicit cap inherits its parent's).
 */

// 1Shot public relayer target on Base — the final delegate that redeems + sponsors gas.
const BASE_RELAYER_TARGET = "0x26a529124f0bbf9af9d8f9f84a43efe47cf1199a";

interface Hop { delegator: string; delegate: string; capUsdc: number | null }

interface DecodedCaveat { enforcer?: string; terms?: string }
interface DecodedDelegation { delegator?: string; delegate?: string; caveats?: DecodedCaveat[] }

/**
 * Parse the ERC20TransferAmount cap (in USDC) from a hop's caveats. The
 * enforcer's terms are packed `address token ‖ uint256 maxAmount` (20 + 32
 * bytes), so the cap is the trailing 32 bytes parsed as a 6-decimal amount.
 * Returns null when this hop carries no explicit cap (it inherits the parent's).
 */
function capFromCaveats(caveats: DecodedCaveat[] | undefined, enforcer: string): number | null {
  if (!caveats?.length) return null;
  for (const c of caveats) {
    if ((c.enforcer ?? "").toLowerCase() !== enforcer) continue;
    const terms = (c.terms ?? "").replace(/^0x/, "");
    if (terms.length < 64) continue;
    const amountHex = terms.slice(-64); // trailing uint256
    try {
      return Number(BigInt("0x" + amountHex)) / 1e6;
    } catch {
      return null;
    }
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const agent = await getAgent(id);
  if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

  const context = agent.delegationContext;
  const hasContext =
    typeof context === "string" &&
    context.startsWith("0x") &&
    context.length > 20 &&
    !/^0x0*$/.test(context);

  if (!hasContext) {
    return NextResponse.json({
      hasChain: false,
      reason: "This agent has no on-chain delegation yet (grant a permission to activate it).",
    });
  }

  const chainId = agent.chainId === 137 ? 137 : 8453;
  let erc20Enforcer = "";
  try {
    const env = getSmartAccountsEnvironment(chainId);
    erc20Enforcer = String(env.caveatEnforcers?.ERC20TransferAmountEnforcer ?? "").toLowerCase();
  } catch { /* environment unavailable — caps degrade to null */ }

  let hops: Hop[] = [];
  try {
    // decodeDelegations returns the chain leaf → root; reverse to read root → leaf
    // (user/session first, relayer last) — the natural left-to-right flow.
    const decoded = decodeDelegations(context as `0x${string}`) as DecodedDelegation[];
    hops = decoded
      .map(d => ({
        delegator: String(d.delegator ?? ""),
        delegate:  String(d.delegate ?? ""),
        capUsdc:   capFromCaveats(d.caveats, erc20Enforcer),
      }))
      .reverse();

    // Root → leaf: a hop with no explicit cap inherits its parent's effective cap.
    let inherited: number | null = null;
    for (const hop of hops) {
      if (hop.capUsdc === null) hop.capUsdc = inherited;
      else inherited = hop.capUsdc;
    }
  } catch (e) {
    return NextResponse.json({
      hasChain: false,
      reason: "Could not decode this agent's delegation context.",
      error: e instanceof Error ? e.message : String(e),
    });
  }

  const relayerTarget = (agent.chainId === 8453 || !agent.chainId) ? BASE_RELAYER_TARGET : null;

  return NextResponse.json({
    hasChain:          hops.length > 0,
    hops,                                   // [{ delegator, delegate }] root → leaf
    cap:               agent.delegationCap ?? agent.budgetUsdc,
    scopedHash:        agent.delegationHash ?? null,
    delegationManager: agent.delegationManagerAddress ?? null,
    relayerTarget,
    // The Fund Manager holds the grant and splits the budget — it never trades.
    isCustodian:       /fund manager/i.test(agent.name),
  });
}
