import "server-only";
import { createWalletClient, createPublicClient, http, encodeFunctionData, parseAbi, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { getSessionPrivateKey } from "@/lib/config/env";

const CLOVE_AUTO_DEPOSIT_ABI = [
  {
    name: "forward", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "protocol", type: "string" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "withdraw", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "protocol", type: "string" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "forwardSwap", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "fee", type: "uint24" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "usdcBalance", type: "function", stateMutability: "view",
    inputs: [], outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "userAaveBalance", type: "function", stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

const CHAIN = sepolia;
const RPC = process.env.BASE_RPC ?? "https://ethereum-sepolia-rpc.publicnode.com";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ERC20_META_ABI = parseAbi([
  "function symbol() view returns (string)",
  "function name() view returns (string)",
  "function decimals() view returns (uint8)",
]);

export interface ReceivedToken {
  symbol:  string;
  name:    string;
  address: `0x${string}`;
  amount:  string;
}

let operatorTxLock: Promise<unknown> = Promise.resolve();

async function sendFromOperator(
  to: `0x${string}`,
  data: `0x${string}`,
  gas: bigint,
): Promise<`0x${string}`> {
  const signer = privateKeyToAccount(getSessionPrivateKey());
  const wallet = createWalletClient({ account: signer, chain: CHAIN, transport: http(RPC) });
  const pub    = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  const send = operatorTxLock.then(async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const nonce = await pub.getTransactionCount({ address: signer.address, blockTag: "pending" });
        return await wallet.sendTransaction({ to, data, gas, nonce });
      } catch (e) {
        lastErr = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (/nonce/i.test(msg) && attempt < 2) {
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        throw e;
      }
    }
    throw lastErr;
  });
  operatorTxLock = send.then(() => {}, () => {});
  return send as Promise<`0x${string}`>;
}

export async function resolveReceivedToken(
  txHash: `0x${string}`,
  user: `0x${string}`,
): Promise<ReceivedToken | null> {
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  let receipt;
  try { receipt = await pub.getTransactionReceipt({ hash: txHash }); }
  catch { return null; }
  if (receipt.status !== "success") return null;
  const userTopic = ("0x" + user.toLowerCase().slice(2).padStart(64, "0"));
  const credited = receipt.logs.filter(
    l => l.topics[0]?.toLowerCase() === TRANSFER_TOPIC && l.topics[2]?.toLowerCase() === userTopic,
  );
  if (credited.length === 0) return null;
  const log   = credited[credited.length - 1];
  const token = log.address as `0x${string}`;
  let raw = 0n;
  try { raw = BigInt(log.data); } catch {}
  let symbol = "TOKEN", name = "", decimals = 18;
  try { symbol   = await pub.readContract({ address: token, abi: ERC20_META_ABI, functionName: "symbol"   }) as string; } catch {}
  try { name     = await pub.readContract({ address: token, abi: ERC20_META_ABI, functionName: "name"     }) as string; } catch {}
  try { decimals = await pub.readContract({ address: token, abi: ERC20_META_ABI, functionName: "decimals" }) as number; } catch {}
  return { symbol, name, address: token, amount: formatUnits(raw, decimals) };
}

async function waitForUsdcBalance(
  contractAddress: `0x${string}`,
  expectedAtoms: bigint,
  timeoutMs = 60_000,
): Promise<boolean> {
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const bal = await pub.readContract({
      address: contractAddress, abi: CLOVE_AUTO_DEPOSIT_ABI, functionName: "usdcBalance",
    }) as bigint;
    if (bal >= expectedAtoms) return true;
    await new Promise(r => setTimeout(r, 3_000));
  }
  return false;
}

export async function getContractUsdcBalance(): Promise<bigint> {
  const contractAddress = process.env.CLOVE_AUTO_DEPOSIT as `0x${string}` | undefined;
  if (!contractAddress) return 0n;
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  try {
    return await pub.readContract({
      address: contractAddress, abi: CLOVE_AUTO_DEPOSIT_ABI, functionName: "usdcBalance",
    }) as bigint;
  } catch { return 0n; }
}

export async function getUserProtocolBalance(
  user: `0x${string}`,
  protocol: string,
): Promise<bigint> {
  const contractAddress = process.env.CLOVE_AUTO_DEPOSIT as `0x${string}` | undefined;
  if (!contractAddress) return 0n;
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  const proto = protocol.toLowerCase();
  try {
    if (proto === "aave") {
      return await pub.readContract({
        address: contractAddress, abi: CLOVE_AUTO_DEPOSIT_ABI,
        functionName: "userAaveBalance", args: [user],
      }) as bigint;
    }
  } catch {}
  return 0n;
}

export async function withdrawFromProtocol(
  user: `0x${string}`,
  protocol: string,
  amountAtoms: bigint,
): Promise<`0x${string}`> {
  const contractAddress = process.env.CLOVE_AUTO_DEPOSIT as `0x${string}` | undefined;
  if (!contractAddress) throw new Error("CLOVE_AUTO_DEPOSIT not set");
  const pk = getSessionPrivateKey();
  const signer = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account: signer, chain: CHAIN, transport: http(RPC) });
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  const data = encodeFunctionData({
    abi: CLOVE_AUTO_DEPOSIT_ABI, functionName: "withdraw",
    args: [user, protocol, amountAtoms],
  });
  let gas = 800_000n;
  try {
    const est = await pub.estimateContractGas({
      address: contractAddress, abi: CLOVE_AUTO_DEPOSIT_ABI,
      functionName: "withdraw", args: [user, protocol, amountAtoms], account: signer,
    });
    gas = (est * 150n) / 100n;
  } catch {}
  const hash = await sendFromOperator(contractAddress, data, gas);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`withdraw() reverted on-chain (tx ${hash})`);
  }
  return hash;
}

export async function forwardToProtocol(
  user: `0x${string}`,
  protocol: string,
  amountAtoms: bigint,
): Promise<`0x${string}`> {
  const contractAddress = process.env.CLOVE_AUTO_DEPOSIT as `0x${string}` | undefined;
  if (!contractAddress) throw new Error("CLOVE_AUTO_DEPOSIT not set in .env.local");
  const pk = getSessionPrivateKey();
  const signer = privateKeyToAccount(pk);
  const wallet = createWalletClient({ account: signer, chain: CHAIN, transport: http(RPC) });
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  const arrived = await waitForUsdcBalance(contractAddress, amountAtoms);
  if (!arrived) throw new Error("[cloveAutoDeposit] USDC did not arrive in contract within 60s");
  const data = encodeFunctionData({
    abi: CLOVE_AUTO_DEPOSIT_ABI, functionName: "forward",
    args: [user, protocol, amountAtoms],
  });
  let gas = 800_000n;
  try {
    const est = await pub.estimateContractGas({
      address: contractAddress, abi: CLOVE_AUTO_DEPOSIT_ABI,
      functionName: "forward", args: [user, protocol, amountAtoms], account: signer,
    });
    gas = (est * 150n) / 100n;
  } catch {}
  const hash = await sendFromOperator(contractAddress, data, gas);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`forward() reverted on-chain — deposit did NOT happen (tx ${hash})`);
  }
  return hash;
}

export async function forwardSwapToken(
  user: `0x${string}`,
  tokenOut: `0x${string}`,
  amountAtoms: bigint,
  _useAerodrome = false,
  fee = 3000,
): Promise<`0x${string}`> {
  const contractAddress = process.env.CLOVE_AUTO_DEPOSIT as `0x${string}` | undefined;
  if (!contractAddress) throw new Error("CLOVE_AUTO_DEPOSIT not set");
  const signer = privateKeyToAccount(getSessionPrivateKey());
  const wallet = createWalletClient({ account: signer, chain: CHAIN, transport: http(RPC) });
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  const arrived = await waitForUsdcBalance(contractAddress, amountAtoms);
  if (!arrived) throw new Error("[cloveAutoDeposit] USDC did not arrive in contract within 60s");
  const data = encodeFunctionData({
    abi: CLOVE_AUTO_DEPOSIT_ABI, functionName: "forwardSwap",
    args: [user, tokenOut, fee, amountAtoms],
  });
  let gas = 900_000n;
  try {
    const est = await pub.estimateContractGas({
      address: contractAddress, abi: CLOVE_AUTO_DEPOSIT_ABI,
      functionName: "forwardSwap", args: [user, tokenOut, fee, amountAtoms], account: signer,
    });
    gas = (est * 150n) / 100n;
  } catch {}
  const hash = await sendFromOperator(contractAddress, data, gas);
  const receipt = await pub.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    throw new Error(`forwardSwap reverted — likely no Uniswap pool for ${tokenOut} (tx ${hash})`);
  }
  return hash;
}

export interface SwapVenue {
  useAerodrome: boolean;
  fee: number;
  source: "uniswap-pool-scan";
}

const USDC_SEPOLIA    = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const;
const UNI_V3_FACTORY  = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c" as const;
const FEE_TIERS       = [100, 500, 3000, 10000] as const;
const FACTORY_ABI = parseAbi([
  "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address)",
]);
const POOL_LIQ_ABI = parseAbi(["function liquidity() view returns (uint128)"]);

export async function pickSwapVenue(tokenOut: `0x${string}`): Promise<SwapVenue | null> {
  const pub = createPublicClient({ chain: CHAIN, transport: http(RPC) });
  let bestFee = 0; let bestLiq = -1n;
  await Promise.all(FEE_TIERS.map(async (fee) => {
    try {
      const pool = await pub.readContract({
        address: UNI_V3_FACTORY, abi: FACTORY_ABI, functionName: "getPool",
        args: [USDC_SEPOLIA, tokenOut, fee],
      }) as `0x${string}`;
      if (!pool || /^0x0+$/.test(pool)) return;
      const liq = await pub.readContract({ address: pool, abi: POOL_LIQ_ABI, functionName: "liquidity" }) as bigint;
      if (liq > bestLiq) { bestLiq = liq; bestFee = fee; }
    } catch {}
  }));
  if (bestFee > 0 && bestLiq > 0n) {
    return { useAerodrome: false, fee: bestFee, source: "uniswap-pool-scan" };
  }
  return null;
}
