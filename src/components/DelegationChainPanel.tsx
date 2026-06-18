"use client";

import React, { useEffect, useState } from "react";
import { ShieldCheck, ArrowRight, ExternalLink } from "lucide-react";

import { INK_1, ACCENT, ACCENT_TX, ACCENT_SOFT, TEXT, TEXT2, MID, LINE, LINE_MID } from "@/lib/ui/tokens";

interface Hop { delegator: string; delegate: string; capUsdc?: number | null }
interface ChainData {
  hasChain: boolean;
  hops?: Hop[];
  cap?: string;
  scopedHash?: string | null;
  relayerTarget?: string | null;
  isCustodian?: boolean;
  reason?: string;
}

const short = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "—");

/**
 * #5 — renders an agent's real ERC-7710 delegation chain (user → session →
 * THIS AGENT, capped → 1Shot relayer), proving the agent is on-chain. Data
 * comes from /api/agent/[id]/delegation (server-side decodeDelegations).
 */
export default function DelegationChainPanel({ agentId }: { agentId: string }) {
  const [data, setData] = useState<ChainData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/agent/${agentId}/delegation`)
      .then(r => (r.ok ? r.json() : null))
      .then((d: ChainData | null) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) { setData(null); setLoading(false); } });
    return () => { cancelled = true; };
  }, [agentId]);

  const wrap = (children: React.ReactNode) => (
    <div style={{ background: INK_1, border: `1px solid ${LINE_MID}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: TEXT2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        <ShieldCheck size={13} style={{ color: ACCENT_TX }} /> On-chain delegation
      </div>
      {children}
    </div>
  );

  if (loading) return wrap(<div style={{ fontSize: 12.5, color: MID }}>Decoding chain…</div>);

  if (data?.isCustodian) {
    return wrap(
      <div style={{ fontSize: 12.5, color: TEXT2, lineHeight: 1.5 }}>
        <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 999, background: ACCENT_SOFT, color: ACCENT_TX, fontSize: 11, marginRight: 6 }}>Custodian</span>
        Holds the grant and splits the budget into on-chain-capped slices for the workers. It never trades, so it doesn&apos;t run.
      </div>,
    );
  }

  if (!data?.hasChain || !data.hops?.length) {
    return wrap(<div style={{ fontSize: 12.5, color: MID, lineHeight: 1.5 }}>{data?.reason ?? "No on-chain delegation yet."}</div>);
  }

  // Address sequence root → leaf: first delegator, then each delegate.
  const addrs = [data.hops[0].delegator, ...data.hops.map(h => h.delegate)];
  const relayer = (data.relayerTarget ?? "").toLowerCase();
  const label = (addr: string, i: number): string => {
    if (addr.toLowerCase() === relayer) return "1Shot relayer";
    if (i === 0) return "Your session";
    // The hop just before the relayer is this agent's capped signer.
    const isAgentHop = i === addrs.length - 2;
    return isAgentHop ? "This agent" : "Sub-delegate";
  };

  return wrap(
    <>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
        {addrs.map((addr, i) => {
          const isRelayer = addr.toLowerCase() === relayer;
          const isAgent = i === addrs.length - 2 && !isRelayer;
          return (
            <React.Fragment key={`${addr}-${i}`}>
              <div style={{
                display: "flex", flexDirection: "column", gap: 1, padding: "6px 9px", borderRadius: 8,
                background: isAgent ? "rgba(164,110,219,0.08)" : "transparent",
                border: `1px solid ${isAgent ? ACCENT_SOFT : LINE}`,
              }}>
                <span style={{ fontSize: 9.5, color: isRelayer ? ACCENT_TX : MID, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label(addr, i)}</span>
                <a href={`https://basescan.org/address/${addr}`} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 11.5, color: TEXT, fontFamily: "var(--mono, monospace)", textDecoration: "none" }}>
                  {short(addr)}
                </a>
              </div>
              {i < addrs.length - 1 && <ArrowRight size={13} style={{ color: MID, flexShrink: 0 }} />}
            </React.Fragment>
          );
        })}
      </div>

      {(() => {
        // Narrowing-caveat bars: the ERC20TransferAmount cap enforced at each
        // hop, shrinking down the chain. Proves authority only ever narrows.
        const caps = data.hops!.map(h => (typeof h.capUsdc === "number" ? h.capUsdc : null));
        if (!caps.some(c => c !== null)) return null;
        const maxCap = Math.max(...caps.map(c => c ?? 0), 0.000001);
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
            <div style={{ fontSize: 10, color: MID, letterSpacing: "0.08em", textTransform: "uppercase" }}>
              On-chain cap per hop — authority only narrows
            </div>
            {data.hops!.map((h, i) => {
              const cap = caps[i];
              const pct = cap === null ? 0 : Math.max(4, Math.round((cap / maxCap) * 100));
              const roleLabel = label(h.delegate, i + 1);
              return (
                <div key={`cap-${i}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 78, flexShrink: 0, fontSize: 10.5, color: MID, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{roleLabel}</span>
                  <div style={{ flex: 1, height: 7, borderRadius: 4, background: LINE_MID, overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: ACCENT }} />
                  </div>
                  <span style={{ width: 86, flexShrink: 0, textAlign: "right", fontSize: 11, color: cap === null ? MID : ACCENT_TX, fontVariantNumeric: "tabular-nums" }}>
                    {cap === null ? "—" : `≤ ${cap.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12 }}>
        {data.cap && (
          <div><span style={{ color: MID }}>On-chain cap: </span><span style={{ color: ACCENT_TX }}>{data.cap} USDC</span></div>
        )}
        {data.scopedHash && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <span style={{ color: MID }}>Scoped hash: </span>
            <span style={{ color: TEXT2, fontFamily: "var(--mono, monospace)" }}>{short(data.scopedHash)}</span>
            <ExternalLink size={11} style={{ color: MID }} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 11, color: MID, lineHeight: 1.5 }}>
        Gas is sponsored in USDC by the relayer; this agent&apos;s spend is capped on-chain against its own address.
      </div>
    </>,
  );
}
