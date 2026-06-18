"use client";

import { useState, useEffect } from "react";

interface FeeData {
  gasFeUsdc:       number;
  totalNeededUsdc: number;
  positionUsdc:    number;
  gasPriceGwei?:   string;
  expiresInSec?:   number;
  message:         string;
  note:            string;
  estimated?:      boolean;
  relayer:         string;
}

interface GasFeeDisclosureProps {
  /** DeFi position size in USDC (e.g. 50) */
  positionUsdc: number;
  /** Callback when user confirms they understand the fee */
  onConfirm?: () => void;
  /** Compact mode — just shows the fee badge, no full card */
  compact?: boolean;
}

/**
 * Shows the user exactly how much USDC gas will cost before they
 * grant an ERC-7715 permission or run an agent.
 *
 * Fetches a live quote from /api/relay/fee (which calls the 1Shot
 * Public Relayer's relayer_getFeeData). Updates every 30 seconds.
 */
export function GasFeeDisclosure({ positionUsdc, onConfirm, compact = false }: GasFeeDisclosureProps) {
  const [fee, setFee]         = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetch_ = async () => {
      try {
        const res  = await fetch(`/api/relay/fee?amount=${positionUsdc}`);
        const data = await res.json() as FeeData;
        if (!cancelled) { setFee(data); setLoading(false); }
      } catch {
        if (!cancelled) setLoading(false);
      }
    };
    fetch_();
    // Refresh every 30s (fee quote validity window)
    const interval = setInterval(fetch_, 30_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [positionUsdc]);

  if (compact) {
    if (loading || !fee) return (
      <span style={{ fontSize: 11, color: "#6F6E63", fontFamily: "system-ui" }}>
        Fetching gas fee…
      </span>
    );
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 11, padding: "2px 8px", borderRadius: 999,
        background: "rgba(164,110,219,0.08)",
        color: "#A46EDB",
        border: "1px solid rgba(164,110,219,0.2)",
        fontFamily: "system-ui",
        fontVariantNumeric: "tabular-nums",
      }}>
        ⛽ Gas: ~${fee.gasFeUsdc.toFixed(2)} USDC
        {fee.estimated && " (est.)"}
      </span>
    );
  }

  return (
    <div style={{
      background: "rgba(164,110,219,0.04)",
      border: "1px solid rgba(164,110,219,0.15)",
      borderRadius: 12,
      padding: "16px 18px",
      fontFamily: "'Geist', system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 14 }}>⛽</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#A46EDB", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Gas fee disclosure
        </span>
        {fee?.estimated && (
          <span style={{ fontSize: 10, color: "#6F6E63", marginLeft: "auto" }}>estimated</span>
        )}
      </div>

      {loading ? (
        <div style={{ fontSize: 12, color: "#6F6E63", padding: "4px 0" }}>
          Fetching live gas quote from 1Shot relayer…
        </div>
      ) : fee ? (
        <>
          {/* Fee breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            <FeeRow label="DeFi position"  value={`$${fee.positionUsdc.toFixed(2)} USDC`} />
            <FeeRow label="Gas fee (USDC)" value={`$${fee.gasFeUsdc.toFixed(2)} USDC`}   accent />
            <div style={{ borderTop: "1px solid rgba(164,110,219,0.1)", margin: "4px 0" }} />
            <FeeRow label="Total needed"   value={`$${fee.totalNeededUsdc.toFixed(2)} USDC`} bold />
          </div>

          {/* Key fact */}
          <div style={{
            background: "rgba(11,12,9,0.6)", borderRadius: 8, padding: "10px 12px",
            fontSize: 12, color: "#D4C4EC", lineHeight: 1.6, marginBottom: 14,
          }}>
            <strong style={{ color: "#F0EDF5" }}>No ETH needed.</strong> Gas is paid in USDC
            directly from your delegation budget via the{" "}
            <span style={{ color: "#A46EDB" }}>1Shot Public Relayer</span>.
            {fee.gasPriceGwei && (
              <span style={{ color: "#6F6E63" }}> Current Base gas: {fee.gasPriceGwei} gwei.</span>
            )}
          </div>

          {/* Confirm button (if callback provided) */}
          {onConfirm && !confirmed && (
            <button
              onClick={() => { setConfirmed(true); onConfirm(); }}
              style={{
                width: "100%", padding: "10px", borderRadius: 8,
                background: "#A46EDB", color: "#000",
                fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer",
                fontFamily: "inherit", letterSpacing: "-0.005em",
              }}
            >
              I understand — budget ${fee.totalNeededUsdc.toFixed(2)} USDC
            </button>
          )}
          {confirmed && (
            <div style={{ fontSize: 12, color: "#A46EDB", textAlign: "center" }}>
              ✓ Fee acknowledged
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 12, color: "#F2B85C" }}>
          Could not fetch live fee. Estimated ~$0.05 USDC gas on Base.
        </div>
      )}
    </div>
  );
}

function FeeRow({ label, value, accent, bold }: {
  label: string; value: string; accent?: boolean; bold?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ fontSize: 12, color: accent ? "#A46EDB" : "#8F8E82" }}>{label}</span>
      <span style={{
        fontSize: 13, fontVariantNumeric: "tabular-nums",
        fontWeight: bold ? 600 : 500,
        color: accent ? "#A46EDB" : bold ? "#F0EDF5" : "#D4C4EC",
      }}>{value}</span>
    </div>
  );
}


/**
 * Minimal inline gas fee badge — use this anywhere space is tight.
 * e.g. next to a "Grant Permission" button.
 */
export function GasFeeBadge({ positionUsdc }: { positionUsdc: number }) {
  return <GasFeeDisclosure positionUsdc={positionUsdc} compact />;
}
