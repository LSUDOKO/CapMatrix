export const CHAIN = {
  BASE: 8453,
  SEPOLIA: 11155111,
  MAINNET: 1,
} as const;

// ── Tokens ───────────────────────────────────────────────────────────────────

export const TOKENS = {
  USDC: {
    [CHAIN.BASE]:    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    [CHAIN.SEPOLIA]: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  },
  WETH: {
    [CHAIN.BASE]:    "0x4200000000000000000000000000000000000006",
    [CHAIN.SEPOLIA]: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
  },
  wstETH: {
    [CHAIN.MAINNET]: "0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0",
  },
  stETH: {
    [CHAIN.MAINNET]: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
  },
} as const;

// ── Uniswap V3 ────────────────────────────────────────────────────────────────

export const UNISWAP_V3 = {
  factory: {
    [CHAIN.SEPOLIA]: "0x0227628f3F023bb0B980b67D528571c95c6DaC1c",
    [CHAIN.MAINNET]: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
  },
  positionManager: {
    [CHAIN.SEPOLIA]: "0x1238536071E1c677A632429e3655c799b22cDA52",
    [CHAIN.MAINNET]: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88",
  },
  swapRouter: {
    [CHAIN.SEPOLIA]: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E",
    [CHAIN.MAINNET]: "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45",
  },
  quoter: {
    [CHAIN.SEPOLIA]: "0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6",
    [CHAIN.MAINNET]: "0x61fFE014bA17989E743c5F6cB21bF9697530B21e",
  },
} as const;

// ── Morpho ────────────────────────────────────────────────────────────────────

export const MORPHO = {
  blue: {
    [CHAIN.BASE]:    "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
    [CHAIN.SEPOLIA]: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
    [CHAIN.MAINNET]: "0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb",
  },
  vaults: {
    MOONWELL_USDC: "0xc1256Ae5FF1cf2719D4937adb3bbCCab2E00A2Ca",
    GAUNTLET_USDC: "0xeE8F4eC5672F09119b96Ab6fB59C27E1b7e44b61",
  },
} as const;

// ── Aave v3 ────────────────────────────────────────────────────────────────────

export const AAVE_V3 = {
  pool: {
    [CHAIN.SEPOLIA]: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  },
  aUSDC: {
    [CHAIN.SEPOLIA]: "0x16dA4541aD1807f4443d92D26044C1147406EB80",
  },
} as const;
