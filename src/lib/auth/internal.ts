import "server-only";

const HEADER = "x-internal-secret";

function internalSecret(): string {
  return process.env.CAPMATRIX_INTERNAL_SECRET ?? process.env.CLOVE_INTERNAL_SECRET ?? "";
}

/** Headers to attach when calling an internal CapMatrix endpoint server-side. */
export function internalHeaders(): Record<string, string> {
  return { [HEADER]: internalSecret() };
}

/** True if the request carries the correct internal secret. Fail-closed. */
export function isInternalRequest(req: Request): boolean {
  const secret = internalSecret();
  if (!secret) return false;
  return req.headers.get(HEADER) === secret;
}
