"use client";

import React, { useEffect, useState } from "react";
import { Check, X, TriangleAlert, ShieldCheck } from "lucide-react";
import { metamaskStore } from "@/lib/web3/metamaskStore";
import type { GrantedPermission } from "@/lib/web3/permissions";

import { INK_1, ACCENT_TX, TEXT, TEXT2, MID, LINE, LINE_MID, GOOD, BAD, WARN } from "@/lib/ui/tokens";

const short = (a: string) => (a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a || "—");

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

function Row({ icon, tone, children }: { icon: React.ReactNode; tone: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, padding: "6px 9px", borderRadius: 8, background: `${tone}14`, border: `1px solid ${tone}26` }}>
      <span style={{ flexShrink: 0, marginTop: 1, color: tone, display: "inline-flex" }}>{icon}</span>
      <span style={{ fontSize: 11.5, color: TEXT2, lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

function Heading({ tone, children }: { tone: string; children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: tone, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 4 }}>{children}</div>
  );
}

/**
 * Permission Report — the live blast radius of the user's actual ERC-7715 grant.
 *
 * Unlike a report derived from an LLM "strategy" plus a hardcoded fee constant,
 * every line here is computed from the REAL signed permission held in
 * metamaskStore (budget, period, on-chain expiry, token, DelegationManager).
 * "Allows / Prevents / Worst case" is exactly what the cryptography enforces.
 */
export default function PermissionReportPanel() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const unsub = metamaskStore.addListener(() => setTick(x => x + 1));
    return () => unsub();
  }, []);

  const permission: GrantedPermission | null = metamaskStore.getState().permission;

  const wrap = (children: React.ReactNode) => (
    <div style={{ background: INK_1, border: `1px solid ${LINE_MID}`, borderRadius: 12, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: TEXT2, letterSpacing: "0.04em", textTransform: "uppercase" }}>
        <ShieldCheck size={13} style={{ color: ACCENT_TX }} /> Permission report
      </div>
      {children}
    </div>
  );

  if (!permission) {
    return wrap(
      <div style={{ fontSize: 12.5, color: MID, lineHeight: 1.5 }}>
        No active permission. Grant a scoped USDC budget to see exactly what agents can and cannot do.
      </div>,
    );
  }

  const budget   = Number(permission.budgetUsdc) || 0;
  const period   = permission.periodDays || 1;
  // Sub-day periods (hour-level delegations) read in hours, not "0.04 days".
  const periodLabel = period < 1
    ? (() => { const h = Math.round(period * 24); return h === 1 ? "hour" : `${h}-hour period`; })()
    : period === 1 ? "day" : `${period}-day period`;
  const expires  = permission.expiresAt
    ? new Date(permission.expiresAt * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return wrap(
    <>
      <Heading tone={GOOD}>Allows</Heading>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Row icon={<Check size={13} />} tone={GOOD}>
          Spend up to <strong style={{ color: ACCENT_TX }}>{budget} USDC</strong> per {periodLabel}
          {budget > 0 && <> — agents share this one budget, never more</>}
        </Row>
        <Row icon={<Check size={13} />} tone={GOOD}>
          Only the USDC token (<span style={{ fontFamily: "var(--mono, monospace)" }}>{short(USDC_BASE)}</span>) on Base
        </Row>
        <Row icon={<Check size={13} />} tone={GOOD}>
          Gas paid in USDC via the 1Shot relayer — you never need ETH
        </Row>
        <Row icon={<Check size={13} />} tone={GOOD}>
          Revocable on-chain anytime via the DelegationManager
          {permission.delegationManager && (
            <> (<span style={{ fontFamily: "var(--mono, monospace)" }}>{short(permission.delegationManager)}</span>)</>
          )}
        </Row>
      </div>

      <Heading tone={BAD}>Prevents</Heading>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Row icon={<X size={13} />} tone={BAD}>
          Spending more than <strong style={{ color: TEXT }}>{budget} USDC</strong> in any {periodLabel} — overspend reverts on-chain
        </Row>
        <Row icon={<X size={13} />} tone={BAD}>Touching any token other than USDC, or any asset already in your wallet</Row>
        {expires && <Row icon={<X size={13} />} tone={BAD}>Any activity after the grant expires — <strong style={{ color: TEXT }}>{expires}</strong></Row>}
        <Row icon={<X size={13} />} tone={BAD}>Agents keeping the output — staked / deposited assets land back in your wallet</Row>
        <Row icon={<X size={13} />} tone={BAD}>Widening authority down the chain — each redelegation hop only ever narrows the cap</Row>
      </div>

      <Heading tone={WARN}>Worst case</Heading>
      <Row icon={<TriangleAlert size={13} />} tone={WARN}>
        Maximum possible loss is <strong style={{ color: TEXT }}>{budget} USDC</strong> per {periodLabel}
        {expires ? <> until the grant expires ({expires})</> : null} or you revoke — whichever comes first.
        {" "}No agent can ever exceed this, regardless of bugs or compromise.
      </Row>

      <div style={{ fontSize: 10.5, color: MID, lineHeight: 1.5, borderTop: `1px solid ${LINE}`, paddingTop: 8 }}>
        Computed from your live signed ERC-7715 grant — not an estimate. The DelegationManager enforces every line above at redemption.
      </div>
    </>,
  );
}
