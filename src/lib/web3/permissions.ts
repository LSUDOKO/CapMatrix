"use client";

import { createWalletClient, createPublicClient, custom, http, parseUnits, encodeFunctionData } from "viem";
import { erc7715ProviderActions } from "@metamask/smart-accounts-kit/actions";
import { hashDelegation, decodeDelegations, encodeDelegations } from "@metamask/smart-accounts-kit/utils";
import {
  getSmartAccountsEnvironment,
  toMetaMaskSmartAccount,
  Implementation,
  createDelegation,
  ScopeType,
} from "@metamask/smart-accounts-kit";
import { CHAIN, USDC_ADDRESS } from "./config";

// Native USDC on Polygon (0x3c49…). This is what the 1Shot Public Relayer
// accepts for gas fees on Polygon (per relayer_getCapabilities(137)) AND what
// Polymarket now supports as native collateral — so the whole flow uses ONE
// token: grant → relayer fee → bet. (USDC.e would force a swap.)
const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as const;
// Polygon mainnet chain ID
const POLYGON_CHAIN_ID = 137;

// ── Base mainnet DeFi protocol contracts (for FunctionCall-scoped delegation) ──
const RELAYER_TARGET   = "0x26a529124f0bbf9af9d8f9f84a43efe47cf1199a" as `0x${string}`;
const AAVE_V3_POOL     = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as `0x${string}`;
const MORPHO_MOONWELL  = "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca" as `0x${string}`;
const UNISWAP_ROUTER   = "0x2626664c2603336E57B271c5C0b26F421741e481" as `0x${string}`;
const AERODROME_ROUTER = "0xcF77a3Ba9A5CA399B7c97c74d54e5b1Beb874E43" as `0x${string}`;

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
    };
  }
}

// ── Wallet / capability detection ──────────────────────────────────────────────

export type WalletCapability = "none" | "metamask" | "flask" | "mm-advanced";

/**
 * Detect which MetaMask variant is installed.
 *
 * Production MetaMask ≥ v13.23.0 supports `erc20-token-periodic` Advanced
 * Permissions (per MetaMask's Supported Advanced Permissions table). We do NOT
 * probe `wallet_grantPermissions` (that throws a misleading -32601 on a plain
 * EOA even when the wallet would support the grant after a smart-account
 * upgrade). Instead we report by version, and let requestUsdcPermission attempt
 * the real grant (with manual signing as a fallback).
 */
export async function detectWalletCapability(): Promise<{
  capability: WalletCapability;
  version: string;
  supportsERC7715: boolean;
  isFlask: boolean;
}> {
  if (typeof window === "undefined" || !window.ethereum) {
    return { capability: "none", version: "", supportsERC7715: false, isFlask: false };
  }
  if (!window.ethereum.isMetaMask) {
    return { capability: "none", version: "", supportsERC7715: false, isFlask: false };
  }

  let version = "";
  try {
    version = (await window.ethereum.request({ method: "web3_clientVersion" })) as string ?? "";
  } catch { /* ignore */ }

  const isFlask = version.toLowerCase().includes("flask");

  // Parse "MetaMask/v13.32.1" → 13.23.0 is the production threshold for erc20-periodic.
  const verMatch = version.match(/v?(\d+)\.(\d+)\.(\d+)/);
  let supportsERC7715 = isFlask;
  if (!isFlask && verMatch) {
    const [maj, min] = [Number(verMatch[1]), Number(verMatch[2])];
    supportsERC7715 = maj > 13 || (maj === 13 && min >= 23);
  } else if (!isFlask && !verMatch) {
    // Unknown version string — assume modern MetaMask supports it; the grant
    // call will fall back to manual signing if not.
    supportsERC7715 = true;
  }

  const capability: WalletCapability = isFlask ? "flask" : supportsERC7715 ? "mm-advanced" : "metamask";
  return { capability, version, supportsERC7715, isFlask };
}

/** Returns true when any MetaMask-compatible wallet is installed. */
export function isMetaMaskInstalled(): boolean {
  return typeof window !== "undefined" && !!window.ethereum?.isMetaMask;
}

// Base mainnet — the only network CLOVE operates on.
const BASE_CHAIN_HEX = "0x2105"; // 8453
const BASE_CHAIN_PARAMS = {
  chainId: BASE_CHAIN_HEX,
  chainName: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
};

/**
 * Force the wallet onto Base mainnet. CLOVE only works on Base (USDC, the
 * relayer target, every protocol address is Base), so we switch the user there
 * on connect — adding the chain if MetaMask doesn't know it yet. Best-effort:
 * if the user rejects the switch we still return, but the app stays Base-scoped.
 */
export async function ensureBaseNetwork(): Promise<boolean> {
  if (!window.ethereum) return false;
  try {
    const current = (await window.ethereum.request({ method: "eth_chainId" })) as string;
    if (current?.toLowerCase() === BASE_CHAIN_HEX) return true;
  } catch { /* fall through to switch */ }
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: BASE_CHAIN_HEX }],
    });
    return true;
  } catch (e) {
    // 4902 = chain not added to the wallet yet → add it, which also switches.
    const code = (e as { code?: number })?.code;
    if (code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [BASE_CHAIN_PARAMS],
        });
        return true;
      } catch { return false; }
    }
    return false;
  }
}

/** Prompt the user to connect their MetaMask account and return address. */
export async function connectWallet(): Promise<`0x${string}` | null> {
  if (!window.ethereum || !window.ethereum.isMetaMask) return null;
  const accounts = (await window.ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts || accounts.length === 0) return null;
  // CLOVE is Base-only — move the wallet to Base immediately after connect.
  await ensureBaseNetwork();
  return accounts[0] as `0x${string}`;
}

/** Get already-connected addresses without prompting. */
export async function getConnectedAccounts(): Promise<`0x${string}`[]> {
  if (!window.ethereum) return [];
  const accounts = (await window.ethereum.request({
    method: "eth_accounts",
  })) as string[];
  return accounts as `0x${string}`[];
}

/**
 * Actually revoke this site's `eth_accounts` permission in MetaMask, so the
 * wallet shows the dapp as disconnected and `eth_accounts` returns empty on the
 * next load. Without this, MetaMask keeps the site authorized and re-reports the
 * address after a refresh even though the user clicked "Disconnect". Best-effort:
 * older MetaMask builds without `wallet_revokePermissions` just no-op.
 */
export async function disconnectWallet(): Promise<void> {
  if (!window.ethereum) return;
  try {
    await window.ethereum.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }],
    });
  } catch {
    /* method unsupported on this wallet build — local flag still handles it */
  }
}

export interface GrantedPermission {
  permissionsContext: string;
  delegationManager: `0x${string}`;
  grantedTo: `0x${string}`;
  budgetUsdc: string;
  periodDays: number;
  expiresAt: number;
  /** Chain the permission was granted on. 8453 = Base, 137 = Polygon */
  chainId?: number;
  /** Set after the permission is stored in 1Shot API. */
  delegationId?: string;
}

/**
 * Request a USDC periodic spending permission from the user.
 *
 * PRIMARY: ERC-7715 Advanced Permissions via `requestExecutionPermissions`.
 *   - Supported on PRODUCTION MetaMask ≥ v13.23.0 for `erc20-token-periodic`
 *     (per MetaMask's "Supported Advanced Permissions" table) — NO Flask needed.
 *   - Shows the rich human-readable permission UI (amount / period / token).
 *   - Requires the user's account to be a MetaMask smart account; recent MetaMask
 *     upgrades the EOA automatically (EIP-7702) during the grant.
 *
 * FALLBACK: manual EIP-712 delegation signing (`signDelegation`).
 *   - Used only if the wallet doesn't expose `wallet_grantPermissions`
 *     (older MetaMask). Produces the same ABI permissionsContext.
 *
 * @param delegateTo     Session account / relayer target that will redeem
 * @param budgetUsdc     Max USDC per period, e.g. "2"
 * @param periodDays     Period length in days (allowance resets each period)
 * @param justification  Human-readable reason shown in MetaMask
 * @param targetChainId  8453 (Base) or 137 (Polygon)
 */
export async function requestUsdcPermission(
  delegateTo: `0x${string}`,
  budgetUsdc: string,
  periodDays: number,
  justification: string,
  targetChainId: number = CHAIN.id,
): Promise<GrantedPermission> {
  if (!window.ethereum) throw new Error("No wallet extension detected. Install MetaMask.");
  if (!window.ethereum.isMetaMask) throw new Error(
    "Non-MetaMask wallet detected (e.g. Backpack). Disable other wallet extensions and reload, or install MetaMask."
  );

  // ── 1. Connect + switch chain ─────────────────────────────────────────────
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
  if (!accounts || accounts.length === 0) throw new Error("MetaMask has no accounts. Create or unlock an account first.");
  const userEoa = accounts[0] as `0x${string}`;

  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: `0x${targetChainId.toString(16)}` }],
  }).catch(() => { /* already on chain */ });

  const usdcAddress   = targetChainId === POLYGON_CHAIN_ID ? USDC_POLYGON : USDC_ADDRESS;
  const currentTime   = Math.floor(Date.now() / 1000);
  const periodSeconds = periodDays * 24 * 60 * 60;
  const expiry        = currentTime + 90 * 24 * 60 * 60; // permission valid 90 days

  // ── 2. PRIMARY: ERC-7715 Advanced Permissions (rich UI, production MM v13.23+) ──
  try {
    const walletClient = createWalletClient({
      transport: custom(window.ethereum),
    }).extend(erc7715ProviderActions());

    const granted = await walletClient.requestExecutionPermissions([{
      chainId: targetChainId,
      expiry,
      to: delegateTo,
      permission: {
        type: "erc20-token-periodic",
        data: {
          tokenAddress:   usdcAddress,
          periodAmount:   parseUnits(budgetUsdc, 6),
          periodDuration: periodSeconds,
          startTime:      currentTime,
          justification,
        },
        isAdjustmentAllowed: true,
      },
    }]);

    const first = granted[0];
    if (!first) throw new Error("No permission returned from MetaMask");

    const permissionsContext = (first as { context?: string }).context
      ?? JSON.stringify(granted);
    let delegationManager =
      (first as { delegationManager?: string }).delegationManager as `0x${string}`
      ?? (first as { signerMeta?: { delegationManager?: string } }).signerMeta?.delegationManager as `0x${string}`;
    if (!delegationManager || delegationManager.length < 10) {
      delegationManager = getSmartAccountsEnvironment(targetChainId).DelegationManager as `0x${string}`;
    }

    return {
      permissionsContext,
      delegationManager,
      grantedTo:  delegateTo,
      budgetUsdc,
      periodDays,
      expiresAt:  expiry,
      chainId:    targetChainId,
    };
  } catch (e: unknown) {
    const code = (e as { code?: number })?.code;
    const msg  = ((e as { message?: string })?.message ?? "").toLowerCase();
    const methodMissing =
      code === -32601 ||
      msg.includes("does not exist") ||
      msg.includes("not found") ||
      msg.includes("not supported") ||
      msg.includes("unsupported method");      // A real rejection (user denied, etc.) — surface it, don't fall back.
    // Log the actual error details so users see what went wrong instead of [object Object]
    if (!methodMissing) {
      console.error('[permissions] Advanced Permissions failed:', JSON.stringify({ code, message: msg, name: (e as Error)?.name }, null, 2));
      throw e;
    }

    // ── 3. FALLBACK: manual EIP-712 delegation signing (older MetaMask) ──────
    console.warn('[permissions] Advanced Permissions unavailable (code=' + code + '); using manual delegation signing');
    return signDelegationManually(userEoa, delegateTo, budgetUsdc, periodDays, targetChainId);
  }
}

/**
 * Manual EIP-712 delegation signing fallback.
 *
 * Uses Implementation.Stateless7702 so the delegator address == the user's EOA.
 * This keeps on-chain revocation simple: the user calls disableDelegation()
 * from their EOA, and msg.sender == delegator, so it's accepted.
 */
async function signDelegationManually(
  userEoa: `0x${string}`,
  delegateTo: `0x${string}`,
  budgetUsdc: string,
  periodDays: number,
  targetChainId: number,
): Promise<GrantedPermission> {
  const environment  = getSmartAccountsEnvironment(targetChainId);
  const publicClient = createPublicClient({ chain: CHAIN, transport: http() });
  const walletClient = createWalletClient({ account: userEoa, transport: custom(window.ethereum!) });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smartAccount = await toMetaMaskSmartAccount({
    client:         publicClient as any,
    implementation: Implementation.Stateless7702,
    address:        userEoa,                 // smart account address == EOA
    signer:         { walletClient: walletClient as any },
  });

  const delegation = createDelegation({
    from:  smartAccount.address,
    to:    delegateTo,
    environment,
    salt:  `0x${Date.now().toString(16).padStart(64, "0")}` as `0x${string}`,
    scope: {
      type:         "erc20TransferAmount" as const,
      tokenAddress: (targetChainId === POLYGON_CHAIN_ID ? USDC_POLYGON : USDC_ADDRESS),
      maxAmount:    parseUnits(budgetUsdc, 6),
    },
  });

  const signature   = await smartAccount.signDelegation({ delegation });
  const signedDeleg = { ...delegation, signature };

  return {
    permissionsContext: encodeDelegations([signedDeleg]),
    delegationManager:  environment.DelegationManager as `0x${string}`,
    grantedTo:          delegateTo,
    budgetUsdc,
    periodDays,
    expiresAt:          Math.floor(Date.now() / 1000) + periodDays * 24 * 60 * 60,
    chainId:            targetChainId,
  };
}

/**
 * Request a DeFi-scoped delegation for the 1Shot Public Relayer.
 *
 * Unlike the erc20-token-periodic permission (which only allows USDC.transfer
 * and CANNOT call protocols), this uses a FunctionCall-scoped delegation that
 * authorizes the relayer to call:
 *   - USDC.transfer  (relayer gas fee)
 *   - USDC.approve   (let the protocol pull USDC)
 *   - Aave.supply / Morpho.deposit / Uniswap & Aerodrome swap
 * on the protocol contracts. This is what enables REAL on-chain deposits.
 *
 * Built via createDelegation (FunctionCall scope → AllowedTargets +
 * AllowedMethods + ValueLte caveats) and signed via the user's Stateless7702
 * smart account (so delegator == EOA, keeping revocation simple).
 *
 * The user signs a standard MetaMask "Sign data" dialog — no Flask needed.
 */
export async function requestRelayerPermission(
  budgetUsdc: string,
  periodDays: number,
): Promise<GrantedPermission> {
  if (!window.ethereum) throw new Error("No wallet extension detected. Install MetaMask.");
  if (!window.ethereum.isMetaMask) throw new Error(
    "Non-MetaMask wallet detected (e.g. Backpack). Disable other wallet extensions and reload."
  );

  // Connect + ensure Base mainnet
  const accounts = await window.ethereum.request({ method: "eth_requestAccounts" }) as string[];
  if (!accounts || accounts.length === 0) throw new Error("MetaMask has no accounts. Create or unlock an account first.");
  const userEoa = accounts[0] as `0x${string}`;
  await window.ethereum.request({
    method: "wallet_switchEthereumChain",
    params: [{ chainId: `0x${CHAIN.id.toString(16)}` }],
  }).catch(() => {});

  const environment  = getSmartAccountsEnvironment(CHAIN.id);
  const publicClient = createPublicClient({ chain: CHAIN, transport: http() });
  const walletClient = createWalletClient({ account: userEoa, transport: custom(window.ethereum) });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smartAccount = await toMetaMaskSmartAccount({
    client:         publicClient as any,
    implementation: Implementation.Stateless7702,
    address:        userEoa,                 // smart account address == EOA
    signer:         { walletClient: walletClient as any },
  });

  // FunctionCall scope: which contracts + which methods the relayer may call.
  const delegation = createDelegation({
    from:  smartAccount.address,
    to:    RELAYER_TARGET,
    environment,
    salt:  `0x${Date.now().toString(16).padStart(64, "0")}` as `0x${string}`,
    scope: {
      type: ScopeType.FunctionCall,
      targets: [
        USDC_ADDRESS as `0x${string}`,  // transfer (fee) + approve
        AAVE_V3_POOL,                   // supply
        MORPHO_MOONWELL,                // deposit (ERC-4626)
        UNISWAP_ROUTER,                 // exactInputSingle
        AERODROME_ROUTER,               // swapExactTokensForTokens
      ],
      selectors: [
        "transfer(address,uint256)",
        "approve(address,uint256)",
        "supply(address,uint256,address,uint16)",            // Aave v3
        "deposit(uint256,address)",                          // ERC-4626 (Morpho)
        "exactInputSingle((address,address,uint24,address,uint256,uint256,uint160))", // Uniswap v3
        "swapExactTokensForTokens(uint256,uint256,(address,address,bool,address)[],address,uint256)", // Aerodrome
      ],
    },
  });

  const signature   = await smartAccount.signDelegation({ delegation });
  const signedDeleg = { ...delegation, signature };

  return {
    permissionsContext: encodeDelegations([signedDeleg]),
    delegationManager:  environment.DelegationManager as `0x${string}`,
    grantedTo:          RELAYER_TARGET,
    budgetUsdc,
    periodDays,
    expiresAt:          Math.floor(Date.now() / 1000) + periodDays * 24 * 60 * 60,
    chainId:            CHAIN.id,
  };
}

/**
 * Request an ERC-7715 permission for CLOVE's FUND MANAGER (A2A rewire).
 *
 * Grants a USDC periodic spending permission TO CLOVE's REAL session smart
 * account (the Fund Manager, owned by CLOVE_SESSION_KEY) instead of straight to
 * the relayer. The Fund Manager then redelegates SCOPED, CAPPED slices to each
 * worker:
 *
 *     user ──grant──▶ Fund Manager ──redelegate(cap)──▶ Worker ──hop──▶ Relayer
 *
 * Each worker's slice carries an ERC20TransferAmountEnforcer caveat, so a worker
 * that tries to spend past its cap REVERTS on-chain — the real A2A proof.
 *
 * IMPORTANT: this MUST use the ERC-7715 `requestExecutionPermissions` path (via
 * requestUsdcPermission), NOT manual EIP-712 signDelegation. Modern MetaMask
 * rejects raw delegation signatures from its own accounts with
 * "External signature requests cannot sign delegations for internal accounts."
 * The Advanced-Permissions flow is the sanctioned way to authorize a delegate.
 *
 * The erc20-token-periodic grant authorizes USDC.transfer — which is exactly
 * what the relayer redemption bundle does (fee + work transfers), so it's
 * consistent with the existing execution model.
 *
 * @param fundManagerAddress  CLOVE session account from GET /api/session/address?role=fund-manager
 */
export async function requestFundManagerPermission(
  fundManagerAddress: `0x${string}`,
  budgetUsdc: string,
  periodDays: number,
): Promise<GrantedPermission> {
  return requestUsdcPermission(
    fundManagerAddress,
    budgetUsdc,
    periodDays,
    "CapMatrix Fund Manager — splits this budget into capped, revocable worker agents",
    CHAIN.id,
  );
}

/**
 * Permission persistence has moved to MongoDB (server-side).
 * These are kept as no-ops so existing call-sites don't break while
 * the store handles all loading/saving via /api/permission.
 */
export function savePermission(_permission: GrantedPermission) {
  // no-op — store handles persistence via API
}

export function loadPermission(): GrantedPermission | null {
  // no-op — store fetches from API after wallet connects
  return null;
}

export function clearPermission() {
  // no-op — store calls DELETE /api/permission
}

// ── On-chain Revocation ────────────────────────────────────────────────────────

/**
 * ABI for DelegationManager.disableDelegation(Delegation _delegation)
 * The function takes the FULL Delegation struct, not a bytes32 hash.
 * Source: @metamask/smart-accounts-kit dist/index-DXdlz7t4.d.ts
 */
const DISABLE_DELEGATION_ABI = [{
  name: "disableDelegation",
  type: "function" as const,
  stateMutability: "nonpayable" as const,
  inputs: [{
    name: "_delegation",
    type: "tuple",
    components: [
      { name: "delegate",  type: "address" },
      { name: "delegator", type: "address" },
      { name: "authority", type: "bytes32" },
      {
        name: "caveats",
        type: "tuple[]",
        components: [
          { name: "enforcer", type: "address" },
          { name: "terms",    type: "bytes"   },
          { name: "args",     type: "bytes"   },
        ],
      },
      { name: "salt",      type: "uint256" },
      { name: "signature", type: "bytes"   },
    ],
  }],
  outputs: [],
}] as const;

export interface RevocationResult {
  txHash: `0x${string}`;
  delegationHash: `0x${string}`;
}

/**
 * Revoke a granted ERC-7715 permission on-chain.
 *
 * Calls DelegationManager.disableDelegation(Delegation) from the user's
 * MetaMask account (the delegator).  The contract hashes the struct internally
 * and marks that hash as disabled — no future redemptions are possible.
 */
export async function revokePermissionOnChain(
  permission: GrantedPermission,
  userAddress: `0x${string}`
): Promise<RevocationResult> {
  if (!window.ethereum) throw new Error("MetaMask not found");

  // GUARD: a local-only / demo permission has an all-zeros or stub context. There
  // is NOTHING on-chain to revoke — building disableDelegation() from it produces
  // a transaction that reverts, which MetaMask reports as "insufficient funds"
  // (failed gas estimation → max gas limit → fee looks huge). Bail out cleanly
  // BEFORE opening MetaMask so the user clears it locally instead.
  const ctx = permission.permissionsContext;
  const isRealContext =
    typeof ctx === "string" && ctx.startsWith("0x") && ctx.length > 130 && !/^0x0*$/i.test(ctx);
  if (!isRealContext) {
    throw new Error('LOCAL_ONLY: this permission was only stored locally — there is no on-chain delegation to revoke. Use "Clear local" instead.');
  }

  // Decode the ABI-encoded delegation chain stored in permissionsContext
  const delegations = decodeDelegations(ctx as `0x${string}`);
  if (!delegations.length) throw new Error("No delegations found in permissionsContext");

  const rootDelegation = delegations[0];
  // Reject a garbage-decoded (all-zeros) root delegation — nothing real to disable.
  const zeroAddr = "0x0000000000000000000000000000000000000000";
  if (String((rootDelegation as { delegator?: string }).delegator ?? "").toLowerCase() === zeroAddr) {
    throw new Error('LOCAL_ONLY: no real on-chain delegation in this permission — nothing to revoke. Use "Clear local".');
  }
  const delegationHash = hashDelegation(rootDelegation);

  // Encode: disableDelegation(Delegation struct) — NOT a bytes32 hash
  // The SDK Delegation type has salt as `0x${string}` but the ABI tuple needs bigint;
  // cast through unknown so viem can ABI-encode it correctly.
  const calldata = encodeFunctionData({
    abi: DISABLE_DELEGATION_ABI,
    functionName: "disableDelegation",
    args: [rootDelegation as unknown as {
      delegate:  `0x${string}`;
      delegator: `0x${string}`;
      authority: `0x${string}`;
      caveats:   { enforcer: `0x${string}`; terms: `0x${string}`; args: `0x${string}` }[];
      salt:      bigint;
      signature: `0x${string}`;
    }],
  });

  // Send via MetaMask — user (delegator) signs the transaction
  const txHash = (await window.ethereum.request({
    method: "eth_sendTransaction",
    params: [{
      from:    userAddress,
      to:      permission.delegationManager,
      data:    calldata,
      chainId: `0x${CHAIN.id.toString(16)}`,
    }],
  })) as `0x${string}`;

  return { txHash, delegationHash };
}
