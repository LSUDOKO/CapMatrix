import { sepolia } from "viem/chains";

function env(name: string, fallbackName?: string): string {
  return process.env[name] ?? (fallbackName ? process.env[fallbackName] ?? "" : "");
}

export const CHAIN = sepolia;
export const CHAIN_ID = sepolia.id; // 11155111

// USDC on Sepolia (Aave v3 compatible token)
export const USDC_ADDRESS = "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8" as const;

// CapMatrix agent session smart account address (for Sepolia)
export const CLOVE_SESSION_ADDRESS = (
  env("NEXT_PUBLIC_CAPMATRIX_SESSION_ADDRESS", "NEXT_PUBLIC_CLOVE_SESSION_ADDRESS")
) as `0x${string}`;
