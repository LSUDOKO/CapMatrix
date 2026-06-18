"use client";

import { encodeFunctionData } from "viem";

/**
 * Approves the CloveAutoDeposit contract to pull each protocol's receipt token,
 * so agents can withdraw on the user's behalf. Approvals are sent BY the user
 * (EIP-5792 batch where supported, else sequential) — they must be, or the
 * allowance is set for the wrong account and withdrawals silently fail.
 */

const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");

const APPROVE_ABI = [{
  name: "approve",
  type: "function",
  stateMutability: "nonpayable",
  inputs: [
    { name: "spender", type: "address" },
    { name: "amount",  type: "uint256" },
  ],
  outputs: [{ type: "bool" }],
}] as const;

const RECEIPT_TOKENS = [
  { symbol: "aBasUSDC",      address: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB" }, // Aave
  { symbol: "Morpho shares", address: "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca" }, // Morpho vault
  { symbol: "WETH",          address: "0x4200000000000000000000000000000000000006" }, // Uniswap
  { symbol: "AERO",          address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631" }, // Aerodrome
  { symbol: "wstETH",        address: "0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452" }, // Lido
];

export type ApprovalStatus = "idle" | "pending" | "done" | { error: string };

export async function setupWithdrawals(
  userAddress: `0x${string}`,
  onStatus: (s: ApprovalStatus) => void,
): Promise<void> {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const spender = process.env.NEXT_PUBLIC_CLOVE_AUTO_DEPOSIT;
  if (!spender) throw new Error("NEXT_PUBLIC_CLOVE_AUTO_DEPOSIT not set");

  // Switch to Base mainnet
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: "0x2105" }], // 8453
  }).catch(() => {});

  // Build one approve() calldata (same for all tokens)
  const approveCalldata = encodeFunctionData({
    abi: APPROVE_ABI,
    functionName: "approve",
    args: [spender as `0x${string}`, MAX_UINT256],
  });

  onStatus("pending");

  // approve() MUST be sent BY the user — msg.sender becomes the token owner, so
  // allowance[user][spender] is set. (Batching through Multicall3 would make
  // msg.sender = Multicall3, approving on ITS behalf — a silent no-op.)
  //
  // PREFERRED: EIP-5792 wallet_sendCalls — the wallet runs each approve as the
  // user, ideally in one popup. FALLBACK: sequential approvals from the user.
  try {
    await window.ethereum.request({
      method: "wallet_sendCalls",
      params: [{
        version: "1.0",
        chainId: "0x2105",
        from:    userAddress,
        calls:   RECEIPT_TOKENS.map(t => ({ to: t.address as `0x${string}`, data: approveCalldata, value: "0x0" })),
      }],
    });
    onStatus("done");
    return;
  } catch (e) {
    // 4001 = user rejected → respect it, don't fall through to 5 more prompts.
    if ((e as { code?: number })?.code === 4001) throw e;
    // Otherwise the wallet likely doesn't support wallet_sendCalls → sequential.
  }

  for (const t of RECEIPT_TOKENS) {
    await window.ethereum.request({
      method: "eth_sendTransaction",
      params: [{ from: userAddress, to: t.address as `0x${string}`, data: approveCalldata, chainId: "0x2105" }],
    });
  }
  onStatus("done");
}
