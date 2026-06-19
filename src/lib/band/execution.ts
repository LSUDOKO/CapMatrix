/**
 * Shared utilities for extracting on-chain execution data from Band room messages.
 * Used by the Band room detail page, ChatPanel, and BandAIView.
 */

/** Shorten an address for display */
export function shortAddr(addr: string): string {
  if (addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Extract all 0x-prefixed hex addresses (40 chars after 0x) from a string */
export function extractAddresses(text: string): string[] {
  const matches = text.match(/0x[a-fA-F0-9]{40}/g);
  return matches ?? [];
}

/** Extract tx hashes (64 chars after 0x) from a string */
export function extractTxHashes(text: string): string[] {
  const matches = text.match(/0x[a-fA-F0-9]{64}/g);
  return matches ?? [];
}

/** Parse execution data from a message string */
export function extractExecutionData(content: string): {
  txHash: string | null;
  addresses: string[];
  protocol: string | null;
  amount: string | null;
  action: string | null;
  success: boolean | null;
} {
  const txHashes = extractTxHashes(content);
  const addresses = extractAddresses(content).filter(a => !txHashes.includes(a));
  const lower = content.toLowerCase();

  let protocol: string | null = null;
  for (const p of ["morpho", "aave", "uniswap", "aerodrome", "lido", "compound", "sky", "curve", "balancer"]) {
    if (lower.includes(p)) { protocol = p.charAt(0).toUpperCase() + p.slice(1); break; }
  }

  let amount: string | null = null;
  const amtMatch = content.match(/\$?(\d+(?:\.\d+)?)\s*(USDC|ETH|WETH|wstETH|USDT|DAI|WBTC)/i);
  if (amtMatch) amount = `${amtMatch[1]} ${amtMatch[2]}`;

  let action: string | null = null;
  for (const a of ["deposit", "withdraw", "swap", "transfer", "stake", "rebalance", "execute", "approve", "copy trade"]) {
    if (lower.includes(a)) { action = a.charAt(0).toUpperCase() + a.slice(1); break; }
  }

  const success = lower.includes("success") || lower.includes("✅") || lower.includes("confirmed") || lower.includes("completed")
    ? true : lower.includes("fail") || lower.includes("❌") || lower.includes("reverted") || lower.includes("error")
    ? false : null;

  return { txHash: txHashes[0] ?? null, addresses, protocol, amount, action, success };
}

/** Get Basescan URL for a tx hash or address */
export function basescanUrl(hashOrAddress: string, type: "tx" | "address" = "tx"): string {
  return `https://basescan.org/${type}/${hashOrAddress}`;
}

/** Color for an agent type */
export function agentColor(senderName: string | null): string {
  const n = (senderName ?? "").toLowerCase();
  if (n.includes("orchestrator")) return "#A46EDB";
  if (n.includes("scout")) return "#3DCEFF";
  if (n.includes("risk")) return "#FFD93D";
  if (n.includes("executor")) return "#FF8A66";
  return "#8A7CB8";
}

/** Emoji icon for an agent type */
export function agentIcon(senderName: string | null): string {
  const n = (senderName ?? "").toLowerCase();
  if (n.includes("orchestrator")) return "🧠";
  if (n.includes("scout")) return "🔭";
  if (n.includes("risk")) return "🛡️";
  if (n.includes("executor")) return "⚡";
  return "🤖";
}

/** Render inline markdown (bold, code, links) to React nodes */
export function renderInlineMarkdown(text: string, React: typeof import("react"), TEXT: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return React.createElement("strong", { key: i, style: { color: TEXT, fontWeight: 600 } }, part.slice(2, -2));
    }
    if (/^`[^`]+`$/.test(part)) {
      return React.createElement("code", {
        key: i,
        style: {
          fontFamily: "var(--mono, monospace)", fontSize: "0.9em",
          background: "rgba(180,140,222,0.08)", padding: "1px 5px", borderRadius: 4,
        },
      }, part.slice(1, -1));
    }
    if (/^https?:\/\//.test(part)) {
      return React.createElement("a", {
        key: i, href: part, target: "_blank", rel: "noopener noreferrer",
        style: { color: "#A46EDB", textDecoration: "underline", wordBreak: "break-all" },
      }, part);
    }
    return React.createElement(React.Fragment, { key: i }, part);
  });
}
