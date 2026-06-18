"use client";

import React, { useEffect, useState } from "react";
import { BarChart2, ArrowRight, ExternalLink } from "lucide-react";
import { metamaskStore } from "@/lib/web3/metamaskStore";

import { INK_1, ACCENT, ACCENT_TX, TEXT, TEXT2, MID, LINE, LINE_MID, BAD } from "@/lib/ui/tokens";

// Stable colour per protocol so the allocation bar + legend agree.
const PROTO_COLORS: Record<string, string> = {
  morpho: "#A46EDB", aave: "#7CC4FF", lido: BAD,
  uniswap: "#FF6BD6", aerodrome: "#9D7CFF", sky: "#FFD166",
};
const colorFor = (p: string) => PROTO_COLORS[p?.toLowerCase()] ?? "#8A8A7E";

interface Position { protocol: string; amount: string; entryApy: number }
interface Run { runId?: string; timestamp?: string; action?: string; protocol?: string; amount?: string; apy?: number; txHash?: string | null; success?: boolean }
interface AuditRow { protocol: string; claimedUsdc: number; actualUsdc: number; drift: number; ok: boolean }
interface PortfolioData {
  positions?: Position[];
  runs?: Run[];
  totalValueUsd?: number;
  deployedUsd?: number;
  estPnlUsd?: number;
  audit?: AuditRow[];
}

const num = (v: unknown) => Number.parseFloat(String(v ?? 0)) || 0;

/**
 * #2 — portfolio behaviour for the agent panel. Shows the wallet's current
 * allocation (where capital sits + APY), recent moves (which protocol/token got
 * deposited/rebalanced/withdrawn, with tx links), and a claimed-vs-on-chain audit.
 * Especially meaningful for rebalancer agents, which move existing positions.
 */
export default function PortfolioPanel() {
  const [, setTick] = useState(0);
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = metamaskStore.addListener(() => setTick(x => x + 1));
    return () => u();
  }, []);
  const wallet = metamaskStore.getState().userAddress;

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/portfolio?wallet=${encodeURIComponent(wallet)}`)
      .then(r => (r.ok ? r.json() : null))
      .then((d: PortfolioData | null) => { if (!cancelled) { setData(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [wallet]);

  const header = (
    <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: TEXT2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
      <BarChart2 size={13} style={{ color: ACCENT_TX }} /> Portfolio
    </div>
  );

  if (!wallet) return null;

  const positions = (data?.positions ?? []).filter(p => num(p.amount) > 0);
  const totalDeployed = positions.reduce((s, p) => s + num(p.amount), 0) || num(data?.deployedUsd);

  // Recent meaningful moves (skip holds), newest first. A rebalance is recorded
  // as a withdraw run + a deposit run — collapse an adjacent pair into ONE
  // "from → to" row so the move reads as the single action it actually was.
  const rawMoves = (data?.runs ?? []).filter(r => r.action && r.action !== "hold").slice(0, 12);
  const isW = (r: Run) => /withdraw|exit|redeem|unstake/i.test(r.action ?? "");
  const isD = (r: Run) => /deposit|stake|supply|rebalanc|swap|lp/i.test(r.action ?? "");
  const amtClose = (a: Run, b: Run) => Math.abs(num(a.amount) - num(b.amount)) <= Math.max(0.01, num(a.amount) * 0.1);

  type Move =
    | { kind: "single"; run: Run }
    | { kind: "rebalance"; from?: string; to?: string; amount?: string; apy?: number; txHash?: string | null; success: boolean; runId?: string };
  const moves: Move[] = [];
  for (let i = 0; i < rawMoves.length && moves.length < 6; ) {
    const a = rawMoves[i], b = rawMoves[i + 1];
    if (b && ((isW(a) && isD(b)) || (isD(a) && isW(b))) && amtClose(a, b) &&
        a.protocol && b.protocol && a.protocol !== b.protocol) {
      const w = isW(a) ? a : b, d = isD(a) ? a : b;
      moves.push({
        kind: "rebalance", from: w.protocol, to: d.protocol,
        amount: d.amount, apy: d.apy, txHash: d.txHash ?? w.txHash,
        success: a.success !== false && b.success !== false, runId: d.runId ?? w.runId,
      });
      i += 2;
    } else {
      moves.push({ kind: "single", run: a });
      i += 1;
    }
  }

  return (
    <div style={{ background: INK_1, border: `1px solid ${LINE_MID}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
      {header}

      {loading && <div style={{ fontSize: 12.5, color: MID }}>Reading on-chain positions…</div>}

      {!loading && (
        <>
          {/* Summary */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12 }}>
            <div><span style={{ color: MID }}>Value </span><span style={{ color: TEXT }}>${num(data?.totalValueUsd).toFixed(2)}</span></div>
            <div><span style={{ color: MID }}>Deployed </span><span style={{ color: TEXT }}>${totalDeployed.toFixed(2)}</span></div>
            {data?.estPnlUsd != null && (
              <div><span style={{ color: MID }}>Est P/L </span>
                <span style={{ color: num(data.estPnlUsd) >= 0 ? ACCENT_TX : BAD }}>
                  {num(data.estPnlUsd) >= 0 ? "+" : ""}${num(data.estPnlUsd).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Allocation bar + legend */}
          {positions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", background: "rgba(20,21,16,0.05)" }}>
                {positions.map(p => (
                  <div key={p.protocol} title={`${p.protocol}: $${num(p.amount).toFixed(2)}`}
                    style={{ width: `${(num(p.amount) / (totalDeployed || 1)) * 100}%`, background: colorFor(p.protocol) }} />
                ))}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {positions.map(p => (
                  <div key={p.protocol} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: colorFor(p.protocol), flexShrink: 0 }} />
                    <span style={{ color: TEXT, textTransform: "capitalize", flex: 1 }}>{p.protocol}</span>
                    <span style={{ color: TEXT2 }}>${num(p.amount).toFixed(2)}</span>
                    {p.entryApy ? <span style={{ color: ACCENT_TX }}>{p.entryApy}%</span> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ fontSize: 12.5, color: MID }}>No deployed positions yet.</div>
          )}

          {/* Recent moves — which protocol/token changed */}
          {moves.length > 0 && (
            <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 10, color: MID, letterSpacing: "0.04em", textTransform: "uppercase" }}>Recent moves</div>
              {moves.map((m, i) => {
                // Rebalance: a paired withdraw+deposit → one "from → to" row.
                if (m.kind === "rebalance") {
                  return (
                    <div key={m.runId ?? `r-${i}`} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                      <span style={{ color: m.success === false ? BAD : ACCENT_TX, fontSize: 10 }}>●</span>
                      <span style={{ color: TEXT2, display: "inline-flex", alignItems: "center", gap: 5, flex: 1, overflow: "hidden" }}>
                        <span>Rebalance</span>
                        {num(m.amount) > 0 && <span style={{ color: MID }}>${num(m.amount).toFixed(2)}</span>}
                        <span style={{ color: TEXT, textTransform: "capitalize" }}>{m.from}</span>
                        <ArrowRight size={11} style={{ color: MID }} />
                        <span style={{ color: TEXT, textTransform: "capitalize" }}>{m.to}</span>
                        {m.apy ? <span style={{ color: ACCENT_TX }}>{m.apy}%</span> : null}
                      </span>
                      {m.txHash && (
                        <a href={`https://basescan.org/tx/${m.txHash}`} target="_blank" rel="noopener noreferrer"
                          title="View on Basescan" style={{ color: MID }}>
                          <ExternalLink size={11} />
                        </a>
                      )}
                    </div>
                  );
                }
                const r = m.run;
                return (
                  <div key={r.runId ?? `s-${i}`} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                    <span style={{ color: r.success === false ? BAD : ACCENT_TX, fontSize: 10 }}>●</span>
                    <span style={{ color: TEXT2, display: "inline-flex", alignItems: "center", gap: 5, flex: 1, overflow: "hidden" }}>
                      <span style={{ textTransform: "capitalize" }}>{r.action}</span>
                      {num(r.amount) > 0 && <span style={{ color: MID }}>${num(r.amount).toFixed(2)}</span>}
                      {r.protocol && r.protocol !== "unknown" && (
                        <>
                          <ArrowRight size={11} style={{ color: MID }} />
                          <span style={{ color: TEXT, textTransform: "capitalize" }}>{r.protocol}</span>
                        </>
                      )}
                      {r.apy ? <span style={{ color: ACCENT_TX }}>{r.apy}%</span> : null}
                    </span>
                    {r.txHash && (
                      <a href={`https://basescan.org/tx/${r.txHash}`} target="_blank" rel="noopener noreferrer"
                        title="View on Basescan" style={{ color: MID }}>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Audit — claimed vs on-chain (provable, catches silent failures) */}
          {data?.audit && data.audit.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {data.audit.map(a => (
                <span key={a.protocol} title={`claimed $${a.claimedUsdc} · on-chain $${a.actualUsdc}`}
                  style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 999,
                    background: a.ok ? "rgba(164,110,219,0.08)" : "rgba(255,138,102,0.1)",
                    border: `1px solid ${a.ok ? "rgba(164,110,219,0.2)" : "rgba(255,138,102,0.3)"}`,
                    color: a.ok ? ACCENT_TX : BAD, textTransform: "capitalize",
                  }}>
                  {a.protocol} {a.ok ? "verified" : `drift $${a.drift}`}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
