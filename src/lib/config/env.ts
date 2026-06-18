import "server-only";

function requireEnv(names: string[]): string {
  for (const name of names) {
    const v = process.env[name];
    if (v && v.trim() !== "") return v.trim();
  }
  throw new Error(
    `[config] Missing required environment variable: ${names.join(" / ")}. ` +
      `Set it in .env.local (see .env.local.example).`,
  );
}

function optionalEnv(names: string[]): string | undefined {
  for (const name of names) {
    const v = process.env[name];
    if (v && v.trim() !== "") return v.trim();
  }
  return undefined;
}

export function getSessionPrivateKey(): `0x${string}` {
  const key = requireEnv(["CAPMATRIX_SESSION_KEY", "CLOVE_SESSION_KEY"]);
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error(
      "[config] CAPMATRIX_SESSION_KEY / CLOVE_SESSION_KEY must be a 0x-prefixed 32-byte hex private key.",
    );
  }
  return key as `0x${string}`;
}

export function getInternalSecret(): string {
  return requireEnv(["CAPMATRIX_INTERNAL_SECRET", "CLOVE_INTERNAL_SECRET"]);
}

export function getInternalSecretOptional(): string | undefined {
  return optionalEnv(["CAPMATRIX_INTERNAL_SECRET", "CLOVE_INTERNAL_SECRET"]);
}
