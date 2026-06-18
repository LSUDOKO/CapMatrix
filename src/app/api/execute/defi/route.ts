import { NextRequest, NextResponse } from "next/server";
import { parseUnits } from "viem";
import { UNISWAP_V3, MORPHO, AAVE_V3, TOKENS, CHAIN } from "@/lib/protocols/addresses";
import { executeViaPublicRelayer } from "@/lib/oneshot/publicRelayer";

// Needs 120s: relayer confirmation (~15s) + USDC landing check (~60s) + forward() tx (~15s)
export const maxDuration = 120;

interface ExecRequest {
  action?: string;
  protocol?: string;
  nodeConfig?: Record<string, unknown>;
  permissionsContext: string;
  /** Copy-desk: root grant to retry with if the primary (scoped) context is
   *  rejected by the relayer at redemption time. */
  fallbackContext?: string;
  delegationManager: string;
  delegationId?: string;
  walletAddress: string;
}

/** Minimal ABIs (still used for the local "prepared" calldata fallback) */
const ABIS = {
  erc20Approve: [{
    name: "approve", type: "function" as const,
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    stateMutability: "nonpayable" as const, outputs: [{ type: "bool" }],
  }],
  morphoVaultDeposit: [{
    name: "deposit", type: "function" as const,
    inputs: [{ name: "assets", type: "uint256" }, { name: "receiver", type: "address" }],
    stateMutability: "nonpayable" as const, outputs: [{ type: "uint256" }],
  }],
  aaveSupply: [{
    name: "supply", type: "function" as const,
    inputs: [
      { name: "asset",          type: "address" },
      { name: "amount",         type: "uint256" },
      { name: "onBehalfOf",     type: "address" },
      { name: "referralCode",   type: "uint16"  },
    ],
    stateMutability: "nonpayable" as const, outputs: [],
  }],

  uniswapSwap: [{
    name: "exactInputSingle", type: "function" as const,
    inputs: [{
      name: "params", type: "tuple",
      components: [
        { name: "tokenIn", type: "address" }, { name: "tokenOut", type: "address" },
        { name: "fee", type: "uint24" }, { name: "recipient", type: "address" },
        { name: "amountIn", type: "uint256" }, { name: "amountOutMinimum", type: "uint256" },
        { name: "sqrtPriceLimitX96", type: "uint160" },
      ],
    }],
    stateMutability: "nonpayable" as const, outputs: [{ name: "amountOut", type: "uint256" }],
  }],

} as const;

// ── 1Shot Contract Method Registry ────────────────────────────────────────────
// Each entry maps a CLOVE action to:
//  - methodIdEnv: name of the env var holding the UUID from 1Shot dashboard
//  - buildParams: shape of params passed to 1Shot.executeAsDelegator
//  - contractAddress: for local calldata fallback
const C = CHAIN.SEPOLIA; // target chain

const METHOD_REGISTRY = {
  "aave-supply": {
    methodIdEnv: "ONESHOT_METHOD_AAVE_SUPPLY",
    contract: AAVE_V3.pool[C] as `0x${string}`,
    buildParams: (amount: bigint, onBehalfOf: `0x${string}`) => ({
      asset:        TOKENS.USDC[C],
      amount:       amount.toString(),
      onBehalfOf,
      referralCode: "0",
    }),
  },
  "uniswap-swap-exact-input": {
    methodIdEnv: "ONESHOT_METHOD_UNISWAP_SWAP_EXACT_INPUT",
    contract: (UNISWAP_V3.swapRouter as Record<number, string>)[C] as `0x${string}`,
    buildParams: (amount: bigint, recipient: `0x${string}`, nodeConfig?: Record<string, unknown>) => ({
      params: {
        tokenIn:           TOKENS.USDC[C],
        tokenOut:          (nodeConfig?.tokenOut as string) ?? TOKENS.WETH[C],
        fee:               (nodeConfig?.fee as number) ?? 3000,
        recipient,
        amountIn:          amount.toString(),
        amountOutMinimum:  "0",
        sqrtPriceLimitX96: "0",
      },
    }),
  },
} as const;

type ActionKey = keyof typeof METHOD_REGISTRY;

// The authenticated 1Shot "executeAsDelegator" wrapper was removed — CLOVE
// redeems exclusively through the public relayer (relayer_send7710Transaction),
// which 1Shot builds on top of the dev platform. Delegations are built on our
// side via smart-accounts-kit with the final hop to the relayer's target.

export async function POST(request: NextRequest) {
  let body: ExecRequest;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { action, protocol, nodeConfig = {}, permissionsContext, fallbackContext, walletAddress } = body;

  const actionKey = (action ?? protocol ?? "") as string;

  // ── Amount in USDC (6 decimals) ─────────────────────────────────────────────
  const amountStr = (nodeConfig.amount as string) ?? "1.00";
  let defaultAmount: bigint;
  try {
    defaultAmount = parseUnits(amountStr, 6);
  } catch {
    defaultAmount = parseUnits("1", 6);
  }

  // ── Try real on-chain execution ───────────────────────────────────────────────
  const hasRealContext =
    permissionsContext &&
    permissionsContext !== "0xdemo" &&
    permissionsContext !== "0x" &&
    !/^0x0*$/.test(permissionsContext) &&
    permissionsContext.length > 20;

  // ── WITHDRAW path — direct contract call via CloveAutoDeposit, no relayer
  // and no METHOD_REGISTRY entry (registry only covers deposit/swap actions).
  // Checked BEFORE the registry lookup below — otherwise "aave-withdraw" etc.
  // (from rebalance()'s withdraw leg) 400 as "Unknown action" and the agent
  // can never complete a rebalance.
  const isWithdraw = actionKey.includes("withdraw") || (nodeConfig.action as string) === "withdraw";
  if (isWithdraw) {
    const withdrawProtocol =
      protocol === "aave"      ? "aave"
    : protocol === "uniswap"   ? "uniswap"
    : null;
    const autoDepositContract = process.env.CLOVE_AUTO_DEPOSIT as `0x${string}` | undefined;

    if (!hasRealContext) {
      return NextResponse.json({
        error: "No real ERC-7715 permission context. Grant a permission via MetaMask before running agents.",
        code:  "needs-permission",
      }, { status: 400 });
    }
    if (!withdrawProtocol || !autoDepositContract) {
      return NextResponse.json({
        prepared: false,
        error: !withdrawProtocol
          ? `Unknown withdraw protocol: ${protocol}`
          : "CLOVE_AUTO_DEPOSIT not configured",
      }, { status: 400 });
    }

    try {
      const { withdrawFromProtocol } = await import("@/lib/web3/cloveAutoDeposit");
      const withdrawTx = await withdrawFromProtocol(
        walletAddress as `0x${string}`,
        withdrawProtocol,
        defaultAmount,
      );
      return NextResponse.json({
        submitted: true, txHash: withdrawTx,
        action: actionKey, protocol, amount: defaultAmount.toString(),
        via: "clove-auto-withdraw",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[execute/defi] withdraw failed:", msg);
      return NextResponse.json({
        submitted: false,
        error: `Withdraw from ${withdrawProtocol} failed: ${msg}`,
        code: "withdraw-failed",
      }, { status: 502 });
    }
  }

  // ── Deposit / swap actions go through METHOD_REGISTRY ───────────────────────
  const registryEntry = METHOD_REGISTRY[actionKey as ActionKey];

  if (!registryEntry) {
    return NextResponse.json({
      prepared: false,
      error: `Unknown action: ${action ?? protocol}. Supported: aave-supply, uniswap-swap-exact-input.`,
    }, { status: 400 });
  }

  if (hasRealContext) {
    const autoDepositContract = process.env.CLOVE_AUTO_DEPOSIT as `0x${string}` | undefined;

    // ── DEPOSIT path — CloveAutoDeposit pattern ───────────────────────────────
    const protocolName =
      actionKey === "aave-supply"              ? "aave"
    : actionKey === "uniswap-swap-exact-input" ? "uniswap"
    : null;

    if (autoDepositContract && protocolName) {
      try {
        // 1Shot track: on FIRST use, include a 7702 authorizationList to upgrade
        // CLOVE's session (Fund Manager) EOA to a smart account THROUGH the
        // relayer. No-op once it already has code. Never blocks the deposit.
        let authorizationList: unknown[] | undefined;
        try {
          const { build7702Authorization } = await import("@/lib/web3/upgrade7702");
          const { getSessionPrivateKey } = await import("@/lib/config/env");
          const auth = await build7702Authorization(getSessionPrivateKey() as `0x${string}`, 11155111);
          if (auth) authorizationList = [auth];
        } catch { /* non-fatal — proceed without the upgrade */ }

        const tokenOut = nodeConfig?.tokenOut as string | undefined;
        const isCopySwap = protocolName === "uniswap"
          && !!tokenOut && /^0x[a-fA-F0-9]{40}$/.test(tokenOut);

        const completeForward = async (): Promise<`0x${string}`> => {
          if (isCopySwap) {
            const { forwardSwapToken } = await import("@/lib/web3/cloveAutoDeposit");
            const fee = (nodeConfig?.fee as number) ?? 3000;
            return forwardSwapToken(walletAddress as `0x${string}`, tokenOut as `0x${string}`, defaultAmount, false, fee);
          }
          const { forwardToProtocol } = await import("@/lib/web3/cloveAutoDeposit");
          return forwardToProtocol(walletAddress as `0x${string}`, protocolName, defaultAmount);
        };

        // Step 1: relayer sends USDC to CloveAutoDeposit via delegated transfer.
        // The erc20-token-periodic enforcer allows USDC.transfer(contract, amount) ✅
        //
        // REDEMPTION FALLBACK (copy desk): a worker's primary context is a SCOPED
        // multi-hop chain. If the relayer rejects that chain, retry once with the
        // root grant (fallbackContext) so the swap still lands — the per-tier cap
        // is then enforced off-chain by the budget guard instead of the on-chain
        // enforcer. Try contexts in order; stop at the first that confirms.
        const relayContexts = [permissionsContext]
          .concat(fallbackContext && fallbackContext !== permissionsContext ? [fallbackContext] : []);
        let relayResult = await executeViaPublicRelayer({
          userPermissionsContext: relayContexts[0],
          recipient:              autoDepositContract,
          workAmountUsdc:         Number(defaultAmount) / 1e6,
          memo:                   `CLOVE: USDC→${protocolName} via CloveAutoDeposit`,
          authorizationList,
        });
        if ((relayResult.status === "failed" || !relayResult.txHash) && relayContexts[1]) {
          // DOUBLE-SPEND GUARD: the relayer sometimes reports "failed" even though
          // the USDC.transfer in the bundle DID land on-chain. Re-transferring via
          // the fallback would move USDC twice. Only retry if the USDC is NOT
          // already parked in the contract; otherwise fall through to the recovery
          // path below, which forwards the already-delivered USDC.
          const { getContractUsdcBalance } = await import("@/lib/web3/cloveAutoDeposit");
          const parked = await getContractUsdcBalance();
          if (parked < defaultAmount) {
            console.warn("[execute/defi] scoped context rejected (no USDC moved) — retrying with root fallback");
            relayResult = await executeViaPublicRelayer({
              userPermissionsContext: relayContexts[1],
              recipient:              autoDepositContract,
              workAmountUsdc:         Number(defaultAmount) / 1e6,
              memo:                   `CLOVE: USDC→${protocolName} (root fallback)`,
              authorizationList,
            });
          } else {
            console.warn("[execute/defi] primary relay reported failed but USDC already in contract — skipping fallback to avoid double-spend");
          }
        }

        // Call forward() when:
        //   a) Relayer confirmed with txHash (normal case), OR
        //   b) Relayer status failed BUT USDC already arrived in the contract
        //      (happens when relayer marks tx as 400 despite executing on-chain)
        const relaySuccess = relayResult.status !== "failed" && !!relayResult.txHash;

        if (relaySuccess) {
          try {
            const forwardTx = await completeForward();
            const { resolveReceivedToken } = await import("@/lib/web3/cloveAutoDeposit");
            const receiptToken = await resolveReceivedToken(forwardTx, walletAddress as `0x${string}`);
            return NextResponse.json({
              submitted: true, txHash: forwardTx, relayTxHash: relayResult.txHash,
              taskId: relayResult.taskId, action: actionKey, protocol,
              contractAddress: autoDepositContract, amount: defaultAmount.toString(),
              feeUsdc: relayResult.feeUsdc, via: "clove-auto-deposit",
              receiptToken, receivedAmount: receiptToken?.amount ?? (Number(defaultAmount) / 1e6).toString(),
            });
          } catch (fwdErr) {
            // CRITICAL: the relayer ALREADY moved USDC into the contract. Do NOT
            // fall through to the no-contract fallback transfer below — that would
            // double-spend the budget. The parked USDC is recoverable on-chain via
            // CloveAutoDeposit.recover() by the operator. Surface the real reason.
            const msg = fwdErr instanceof Error ? fwdErr.message : String(fwdErr);
            console.warn(`[execute/defi] forward()/forwardSwap() failed after USDC delegated — funds parked in contract:`, msg);
            return NextResponse.json({
              submitted: false,
              error: `USDC was delegated to the contract but the on-chain ${protocolName} call failed: ${msg}`,
              code: "forward-failed",
              relayTxHash: relayResult.txHash, taskId: relayResult.taskId,
              contractAddress: autoDepositContract, amount: defaultAmount.toString(),
              parkedInContract: true, via: "clove-auto-deposit-forward-failed",
            }, { status: 502 });
          }
        }

        // Relayer says failed — but check if USDC landed in contract anyway
        // (relayer sometimes returns 400 despite the on-chain transfer succeeding)
        console.warn("[execute/defi] Relayer status failed — checking contract balance...");
        try {
          const forwardTx = await completeForward();
          const { resolveReceivedToken } = await import("@/lib/web3/cloveAutoDeposit");
          const receiptToken = await resolveReceivedToken(forwardTx, walletAddress as `0x${string}`);
          return NextResponse.json({
            submitted: true, txHash: forwardTx, taskId: relayResult.taskId,
            action: actionKey, protocol, contractAddress: autoDepositContract,
            amount: defaultAmount.toString(), feeUsdc: relayResult.feeUsdc,
            via: "clove-auto-deposit-recovered",
            receiptToken, receivedAmount: receiptToken?.amount ?? (Number(defaultAmount) / 1e6).toString(),
          });
        } catch (fwdErr) {
          console.warn("[execute/defi] forward() also failed:", fwdErr instanceof Error ? fwdErr.message : fwdErr);
        }
      } catch (e) {
        console.warn("[execute/defi] CloveAutoDeposit exception:", e instanceof Error ? e.message : e);
      }
    }

    // ── Fallback: direct relayer transfer (no contract) ─────────────────────────
    // Used when CLOVE_AUTO_DEPOSIT not set or forward() fails.
    // This is still a real ERC-7710 tx through the relayer.
    const transferRecipient = (nodeConfig.recipient as string | undefined) ?? walletAddress;
    try {
      const relayResult = await executeViaPublicRelayer({
        userPermissionsContext: permissionsContext,
        recipient:              transferRecipient as `0x${string}`,
        workAmountUsdc:         Number(defaultAmount) / 1e6,
        memo:                   `CLOVE: ${actionKey} (transfer)`,
      });
      if (relayResult.status !== "failed") {
        return NextResponse.json({
          submitted:  true,
          txHash:     relayResult.txHash,
          taskId:     relayResult.taskId,
          action:     actionKey,
          protocol,
          amount:     defaultAmount.toString(),
          feeUsdc:    relayResult.feeUsdc,
          via:        "1shot-public-relayer",
        });
      }
      return NextResponse.json({
        submitted: false,
        error:     relayResult.error ?? "Relayer rejected.",
        taskId:    relayResult.taskId,
        action:    actionKey,
        protocol,
        code:      "relayer-rejected",
      }, { status: 400 });
    } catch (e) {
      console.warn("[execute/defi] Public relayer exception:", e instanceof Error ? e.message : e);
    }
    // NOTE: the old authenticated 1Shot "executeAsDelegator" fallback was removed.
    // Per 1Shot: the public relayer is built on top of the dev platform, so when
    // you use the relayer you should NOT call the dev-platform execute endpoint —
    // and CLOVE's grants delegate to the relayer target, not the 1Shot server
    // wallet, so executeAsDelegator could never redeem them anyway.
  }

  // No real context = no execution. Return a clear error.
  if (!hasRealContext) {
    return NextResponse.json({
      error: "No real ERC-7715 permission context. Grant a permission via MetaMask before running agents.",
      code:  "needs-permission",
    }, { status: 400 });
  }

  // Real context exists but both execution paths failed — surface the error.
  return NextResponse.json({
    error: "Execution failed via the 1Shot public relayer. Check server logs.",
    action: actionKey,
    protocol,
    submitted: false,
  }, { status: 502 });
}
