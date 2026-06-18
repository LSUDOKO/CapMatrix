"use client";

import React from "react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  MorphoLogo, AaveLogo, UniswapLogo, AerodromeLogo, LidoLogo,
  VeniceLogo, BaseLogo, MetaMaskLogo, OneShotLogo,
} from "@/components/BrandLogos";
import FUIHeroWithBorders from "@/components/ui/herowith-logos";
import { NavBar } from "@/components/ui/tubelight-navbar";
import { Sparkles, Brain, LayoutGrid } from "lucide-react";

const BG = "#000";
const BG_1 = "#0B0018";
const BG_2 = "#1A0033";
const BG_3 = "#200D42";
const ACCENT = "#A46EDB";
const ACCENT_GLOW = "rgba(164,110,219,0.35)";
const TEXT = "#F0EDF5";
const TEXT_2 = "#D4C4EC";
const MID = "#8A7CB8";
const MID_2 = "#9A8CC6";
const LINE = "rgba(180,140,222,0.08)";
const LINE_MID = "rgba(180,140,222,0.15)";

const PROTOCOLS: { name: string; color: string; logo: React.ReactNode }[] = [
  { name: "Morpho",     color: "#3B5BFF", logo: <MorphoLogo size={26} /> },
  { name: "Aave",       color: "#B6509E", logo: <AaveLogo size={26} /> },
  { name: "Uniswap",    color: "#FF007A", logo: <UniswapLogo size={26} /> },
  { name: "Aerodrome",  color: "#0F62FE", logo: <AerodromeLogo size={26} /> },
  { name: "Lido",       color: "#00A3FF", logo: <LidoLogo size={26} /> },
  { name: "Venice AI",  color: "#FF5A1F", logo: <VeniceLogo size={26} /> },
  { name: "Base",       color: "#0052FF", logo: <BaseLogo size={26} /> },
  { name: "MetaMask",   color: "#F6851B", logo: <MetaMaskLogo size={26} /> },
  { name: "1Shot",      color: "#A46EDB", logo: <OneShotLogo size={26} /> },
];

export default function LandingPage() {
  return (
    <div style={{ background: BG, color: TEXT, minHeight: "100vh" }}>
      {/* Floating launch button */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2.5">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium backdrop-blur-lg border"
          style={{
            background: ACCENT,
            color: BG,
            borderColor: "rgba(164,110,219,0.3)",
            boxShadow: "0 4px 20px -8px rgba(164,110,219,0.3)",
            transition: "transform .2s, box-shadow .2s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 28px -8px rgba(164,110,219,0.5)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 20px -8px rgba(164,110,219,0.3)"; }}
        >
          Launch agent ↗
        </Link>
      </div>

      {/* Tubelight nav */}
      <NavBar
        items={[
          { name: "Home",    url: "/",         icon: Sparkles },
          { name: "Agent",   url: "#agent",    icon: Brain },
          { name: "Memory",  url: "#memory",   icon: Brain },
          { name: "Builder", url: "#builder",  icon: LayoutGrid },
        ]}
      />

      {/* Hero */}
      <FUIHeroWithBorders />

      {/* Agent section */}
      <section id="agent" className="px-7 py-[120px]"
        style={{ background: "linear-gradient(to bottom, #000, #0B0018)" }}
      >
        <div className="mx-auto max-w-[1320px]">
          <div className="text-[11px] uppercase tracking-[0.18em] mb-3" style={{ color: MID }}>
            The agent loop
          </div>
          <h2 className="m-0 mb-[60px] max-w-[18ch] text-[clamp(40px,5.4vw,84px)] font-medium leading-[0.96] tracking-[-0.035em]" style={{ color: TEXT }}>
            It thinks{" "}
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400, color: ACCENT }}>before</span>{" "}
            it spends.
          </h2>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-px"
            style={{ background: LINE_MID }}
          >
            {[
              { num: "01", title: "Grant",    body: "Sign one MetaMask Advanced Permission — a capped, revocable USDC budget. No private keys, no per-trade popups, no custody." },
              { num: "02", title: "Allocate", body: "A Fund Manager splits your budget into specialized agents. Each gets its own smart account and an on-chain sub-budget it physically can't exceed." },
              { num: "03", title: "Execute",  body: "Agents reason with Venice AI and your uploaded playbook, then settle on-chain via the 1Shot relayer — gas paid in USDC. Reports the txHash on Telegram." },
            ].map((s) => (
              <div
                key={s.num}
                className="relative flex min-h-[380px] flex-col px-9 py-12"
                style={{ background: BG_1 }}
              >
                <div
                  className="mb-auto text-[84px] leading-[1] tracking-[-0.04em]"
                  style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT, opacity: 0.3 }}
                >
                  {s.num}
                </div>
                <h3 className="m-0 mt-6 mb-2.5 text-[26px] font-medium tracking-[-0.02em]" style={{ color: TEXT }}>{s.title}</h3>
                <p className="m-0 max-w-[36ch] text-[15px] leading-[1.55]" style={{ color: TEXT_2 }}>
                  {s.body}
                </p>
                <span className="absolute right-7 top-6 text-[11px] uppercase tracking-[0.12em]" style={{ color: MID }}>
                  Stage / {s.num}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Agent scrollytelling orb */}
      <AgentOrbSection />

      {/* Memory section */}
      <section id="memory" className="px-7 pt-[120px] pb-[60px]" style={{ background: BG }}>
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 lg:grid-cols-[1fr_1.15fr] gap-[60px] items-start">
          <div className="flex flex-col gap-9">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-3" style={{ color: MID }}>
                Persistent memory
              </div>
              <h2 className="m-0 max-w-[14ch] text-[clamp(40px,5.4vw,72px)] font-medium leading-[0.96] tracking-[-0.035em]" style={{ color: TEXT }}>
                Every agent{" "}
                <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>remembers</span>.
              </h2>
            </div>
            <ul className="list-none m-0 p-0">
              {[
                { t: "Cross-run context", d: "Knows what protocol you're in, when you entered, and what's changed since." },
                { t: "APY history",       d: "7-day rolling trend per protocol — rebalances only when it's a real signal, not noise." },
                { t: "Decision rationale", d: "Records the Venice reasoning behind every action so you can audit later." },
              ].map((x, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[14px_1fr] gap-4 py-[18px] items-start"
                  style={{ borderBottom: i < 2 ? `1px solid ${LINE_MID}` : "none", borderTop: i === 0 ? `1px solid ${LINE_MID}` : "none" }}
                >
                  <span className="mt-2 inline-block h-1.5 w-1.5 rounded-full" style={{ background: ACCENT }} />
                  <div>
                    <strong className="block mb-1 text-[18px] font-medium tracking-[-0.015em]" style={{ color: TEXT }}>{x.t}</strong>
                    <span className="block max-w-[42ch] text-[14px] leading-[1.5]" style={{ color: TEXT_2 }}>
                      {x.d}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Memory feed */}
          <div
            className="overflow-hidden rounded-[14px] border"
            style={{ borderColor: LINE_MID, background: BG_2 }}
          >
            <div
              className="flex items-center gap-2.5 border-b px-[22px] py-3.5 text-[11px] tracking-[0.06em]"
              style={{ borderColor: LINE, color: MID }}
            >
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{ background: ACCENT, boxShadow: "0 0 0 4px rgba(164,110,219,0.25)" }}
              />
              <span className="text-[12px] font-medium tracking-[-0.005em]" style={{ color: TEXT }}>
                Agent memory · 0x4fd5…a5dd
              </span>
              <span className="ml-auto text-[11px]" style={{ color: MID_2 }}>Live</span>
            </div>
            <ul className="m-0 list-none p-0">
              {[
                { d: "Today",      k: "decision", txt: "HOLD — already in best position (Morpho 9.31%)" },
                { d: "Yesterday",  k: "execute",  txt: "Deposited 0.1 USDC → Morpho @ 9.11%" },
                { d: "3 days ago", k: "scout",    txt: "Aave APY dropped to 6.1% — flagged for rebalance review" },
                { d: "4 days ago", k: "observe",  txt: "Playbook rule: skip pools under $5M TVL — held position" },
              ].map((r, i) => (
                <li
                  key={i}
                  className="relative grid grid-cols-[76px_110px_1fr] gap-[18px] items-start border-b px-[22px] py-[18px] text-[13.5px] leading-[1.5] last:border-b-0"
                  style={{ borderColor: LINE }}
                >
                  <span aria-hidden className="absolute left-0 top-[18px] bottom-[18px] w-0.5" style={{ background: ACCENT }} />
                  <span
                    className="text-[18px] leading-[1.2] tracking-[-0.01em]"
                    style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}
                  >
                    {r.d}
                  </span>
                  <span className="pt-1.5 text-[10px] uppercase tracking-[0.14em]" style={{ color: MID }}>
                    {r.k}
                  </span>
                  <span style={{ color: TEXT_2 }}>{r.txt}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section
        id="builder"
        className="relative mt-[60px] overflow-hidden px-7 pb-[160px] pt-[140px]"
        style={{ background: "linear-gradient(to bottom, #000, #0B0018)", color: TEXT }}
      >
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: MID }}>
            Workflow Builder
          </div>
          <h2 className="m-0 max-w-[18ch] text-[clamp(40px,5.4vw,84px)] font-medium leading-[0.96] tracking-[-0.035em]">
            A canvas for{" "}
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>capital</span>.
          </h2>
          <p className="mt-6 max-w-[60ch] text-[18px] leading-[1.55]" style={{ color: TEXT_2 }}>
            Visual node graph for every strategy. Watch your agents reason, decide, and execute on-chain — without ever seeing a terminal.
          </p>

          <DashBoard />

          <div className="mt-[60px] grid grid-cols-2 border-y md:grid-cols-4" style={{ borderColor: LINE }}>
            <MetricBlock value={9.31} decimals={2} unit="%" label="Best APY on Base" arrow="↑" first />
            <MetricBlock value={5} decimals={0} unit="" label="Specialized agents" />
            <MetricBlock value={3} decimals={0} unit="" label="Active runs" />
            <MetricBlock value={Infinity} decimals={0} unit="" label="Memory depth" last />
          </div>

          <div className="mt-[60px] flex justify-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2.5 rounded-full px-[22px] py-[13px] text-[14px] font-medium"
              style={{
                background: ACCENT,
                color: BG,
                transition: "transform .25s cubic-bezier(.2,.8,.2,1), box-shadow .25s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 30px -10px rgba(164,110,219,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              Open builder <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Closing */}
      <section className="relative overflow-hidden px-7 py-[140px] text-center" style={{ background: BG }}>
        <h2 className="mx-auto m-0 mb-7 max-w-[14ch] text-[clamp(56px,9vw,140px)] font-medium leading-[0.93] tracking-[-0.045em]" style={{ color: TEXT }}>
          Quiet capital{" "}
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>begins</span>.
        </h2>
        <p className="mx-auto mb-11 max-w-[48ch] text-[18px] leading-[1.5]" style={{ color: TEXT_2 }}>
          One delegation. Zero keys held. The agent does the rest.
        </p>
        <div className="flex justify-center gap-3.5">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2.5 rounded-full px-[20px] py-[12px] text-[14px] font-medium"
            style={{ background: ACCENT, color: BG }}
          >
            Launch agent <span aria-hidden>↗</span>
          </Link>
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-2.5 rounded-full border px-[20px] py-[12px] text-[14px] font-medium"
            style={{ borderColor: "rgba(164,110,219,0.2)", color: TEXT_2 }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = ACCENT; e.currentTarget.style.color = TEXT; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(164,110,219,0.2)"; e.currentTarget.style.color = TEXT_2; }}
          >
            Browse marketplace
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-7 py-[60px]"
        style={{ borderColor: LINE, background: BG }}
      >
        <div className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-10">
          <div>
            <div className="flex items-center gap-2.5 text-[18px] font-semibold tracking-[-0.01em]" style={{ color: TEXT }}>
              <CloverMark /> CLOVE
            </div>
            <p className="mt-3 max-w-[32ch] text-[13px] leading-[1.55]" style={{ color: MID }}>
              Autonomous DeFi agent OS. Built on Base. Powered by MetaMask Advanced Permissions, 1Shot, and Venice AI.
            </p>
          </div>
          <div className="flex flex-wrap gap-[60px]">
            {([
              { h: "Product",   items: [
                { label: "Dashboard",   href: "/dashboard" },
                { label: "Marketplace", href: "/dashboard" },
                { label: "Pricing",     href: "/#pricing" },
              ]},
              { h: "Resources", items: [
                { label: "Documentation", href: "https://github.com/clove-defi/clove#readme" },
                { label: "Manifesto",     href: "https://github.com/clove-defi/clove#manifesto" },
                { label: "Status",        href: "https://ethglobal.com" },
              ]},
              { h: "Company", items: [
                { label: "Twitter",  href: "https://twitter.com/clove_defi" },
                { label: "Discord",  href: "https://discord.gg/clove" },
                { label: "Contact",  href: "mailto:hi@clove.finance" },
              ]},
            ] as Array<{ h: string; items: { label: string; href: string }[] }>).map((col) => (
              <div key={col.h}>
                <h6 className="m-0 mb-3.5 text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: MID }}>
                  {col.h}
                </h6>
                {col.items.map((a) => (
                  <a
                    key={a.label}
                    className="block py-1 text-[14px] transition"
                    style={{ color: MID_2 }}
                    href={a.href}
                    onMouseEnter={(e) => { e.currentTarget.style.color = TEXT; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = MID_2; }}
                  >
                    {a.label}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div
          className="mx-auto mt-12 flex max-w-[1320px] items-center justify-between border-t pt-7 text-[12px] tracking-[0.04em]"
          style={{ borderColor: LINE, color: MID }}
        >
          <span>© CLOVE 2026 — Autonomous capital, quietly.</span>
          <span>v0.1 · Base mainnet</span>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Agent scrollytelling orb
// ─────────────────────────────────────────────────────────
type OrbState = "rest" | "scout" | "reason" | "execute" | "report";

const ORB_STAGES: Array<{ id: OrbState; eyebrow: string; title: React.ReactNode; body: string }> = [
  {
    id: "rest",
    eyebrow: "Stage 00 · idle",
    title: <>A patient <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>witness</span>.</>,
    body: "The agent waits for a trigger. Between cycles it breathes — no on-chain calls, no spend, no noise.",
  },
  {
    id: "scout",
    eyebrow: "Stage 01 · scan",
    title: <>It reads the <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>market</span>.</>,
    body: "Live APYs, whale flows, and market signals stream in. Venice AI weighs them against your uploaded playbook.",
  },
  {
    id: "reason",
    eyebrow: "Stage 02 · reason",
    title: <>It thinks <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>against</span> memory.</>,
    body: "Cross-checks the scout output against your last 5 runs and 7-day APY trends. Decides: deposit, hold, or rebalance.",
  },
  {
    id: "execute",
    eyebrow: "Stage 03 · execute",
    title: <>It moves the <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>capital</span>.</>,
    body: "1Shot redeems your ERC-7715 delegation, signs a UserOp, broadcasts on Base mainnet. Gasless on your side.",
  },
  {
    id: "report",
    eyebrow: "Stage 04 · report",
    title: <>It writes the <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>memory</span>.</>,
    body: "The tx hash, reasoning, and APY snapshot persist to MongoDB. Telegram pings you. The agent goes quiet.",
  },
];

function AgentOrbSection() {
  const [active, setActive] = useState<OrbState>("rest");
  const refs = useRef<Record<string, HTMLLIElement | null>>({});

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (!visible.length) return;
        const center = window.innerHeight / 2;
        let best = visible[0], bestDist = Infinity;
        for (const e of visible) {
          const r = e.boundingClientRect;
          const mid = r.top + r.height / 2;
          const d = Math.abs(mid - center);
          if (d < bestDist) { bestDist = d; best = e; }
        }
        const id = best.target.getAttribute("data-stage") as OrbState | null;
        if (id) setActive(id);
      },
      { threshold: [0.3, 0.55, 0.8], rootMargin: "-20% 0px -20% 0px" },
    );

    Object.values(refs.current).forEach((el) => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

  return (
    <section className="px-7 pt-[40px] pb-[60px]" style={{ background: BG_1 }}>
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: MID }}>
          The agent loop · in motion
        </div>
        <h2 className="m-0 mb-10 max-w-[14ch] text-[clamp(40px,5.4vw,72px)] font-medium leading-[0.96] tracking-[-0.035em]" style={{ color: TEXT }}>
          Watch it <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>work</span>.
        </h2>

        <div className="grid grid-cols-1 gap-[60px] lg:grid-cols-2 items-start">
          <div
            className="hidden lg:flex items-center justify-center"
            style={{
              position: "sticky",
              top: 140,
              height: "calc(100vh - 200px)",
              minHeight: 560,
            }}
          >
            <AgentOrb state={active} />
          </div>
          <div className="lg:hidden flex items-center justify-center py-10">
            <AgentOrb state={active} />
          </div>
          <ul className="m-0 list-none p-0">
            {ORB_STAGES.map((s, i) => (
              <li
                key={s.id}
                data-stage={s.id}
                ref={(el) => { refs.current[s.id] = el; }}
                className="relative"
                style={{
                  padding: "80px 0",
                  borderBottom: i === ORB_STAGES.length - 1 ? "none" : `1px solid ${LINE_MID}`,
                  borderTop: i === 0 ? `1px solid ${LINE_MID}` : undefined,
                  opacity: active === s.id ? 1 : 0.32,
                  transition: "opacity .6s ease",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 80,
                    width: 2,
                    height: active === s.id ? 60 : 0,
                    background: ACCENT,
                    transition: "height .5s ease",
                  }}
                />
                <div className="mb-4 pl-4 text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: MID }}>
                  {s.eyebrow}
                </div>
                <h3 className="m-0 mb-4 max-w-[18ch] pl-4 text-[clamp(28px,3.4vw,44px)] font-medium leading-[1.05] tracking-[-0.025em]" style={{ color: TEXT }}>
                  {s.title}
                </h3>
                <p className="m-0 max-w-[42ch] pl-4 text-[16.5px] leading-[1.55]" style={{ color: TEXT_2 }}>
                  {s.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function AgentOrb({ state }: { state: OrbState }) {
  return (
    <div className={`agent-orb state-${state}`}>
      <div className="ring r1" />
      <div className="ring r2" />
      <div className="ring r3" />

      <div className="orbit o1"><span className="mote" /></div>
      <div className="orbit o2"><span className="mote" /></div>
      <div className="orbit o3"><span className="mote" /></div>
      <div className="orbit o4"><span className="mote" /></div>

      <svg className="core" width="200" height="200" viewBox="0 0 200 200">
        <circle className="halo" cx="100" cy="100" r="60" fill="none" stroke={ACCENT} strokeWidth="1" opacity="0" />
        <circle className="petal" cx="70"  cy="70"  r="22" />
        <circle className="petal" cx="130" cy="70"  r="22" />
        <circle className="petal" cx="70"  cy="130" r="22" />
        <circle className="petal" cx="130" cy="130" r="22" />
        <line className="link" x1="70" y1="70" x2="130" y2="130" stroke={BG} strokeWidth="1" opacity="0.4" />
        <line className="link" x1="130" y1="70" x2="70" y2="130" stroke={BG} strokeWidth="1" opacity="0.4" />
        <circle className="hub" cx="100" cy="100" r="14" />
      </svg>

      <div className="orb-legend">
        <span className="ld" />
        {state === "rest"    && "Idle"}
        {state === "scout"   && "Scanning markets with Venice"}
        {state === "reason"  && "Reasoning against memory"}
        {state === "execute" && "Submitting UserOp"}
        {state === "report"  && "Writing memory"}
      </div>

      <style jsx>{`
        .agent-orb {
          position: relative;
          width: 380px;
          height: 380px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }
        @media (max-width: 600px) {
          .agent-orb { width: 280px; height: 280px; }
        }

        .ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(164,110,219,0.12);
          transition: transform 1.2s cubic-bezier(.2,.8,.2,1), border-color .8s, opacity .8s;
        }
        .r1 { inset: 0;    animation: spin-cw 60s linear infinite; }
        .r2 { inset: 30px; border-style: dashed; border-color: rgba(164,110,219,0.08); animation: spin-ccw 90s linear infinite; }
        .r3 { inset: 60px; border-color: rgba(164,110,219,0.15); }

        @keyframes spin-cw  { to { transform: rotate(360deg); } }
        @keyframes spin-ccw { to { transform: rotate(-360deg); } }

        .orbit {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          pointer-events: none;
        }
        .mote {
          width: 8px; height: 8px; border-radius: 50%;
          background: ${BG};
          margin-top: -4px;
          transition: background .5s, transform .5s, box-shadow .5s;
        }
        .o1 { animation: orbit-a 14s linear infinite; }
        .o2 { animation: orbit-a 18s linear infinite reverse; animation-delay: -6s; }
        .o3 { animation: orbit-a 22s linear infinite; animation-delay: -13s; }
        .o4 { animation: orbit-a 26s linear infinite reverse; animation-delay: -4s; }
        @keyframes orbit-a { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .core { position: relative; z-index: 2; transition: transform .8s cubic-bezier(.2,.8,.2,1); }
        .core :global(.halo)  { opacity: 0; transition: opacity .8s; }
        .core :global(.petal) {
          fill: ${BG};
          transition: fill .5s, transform .8s cubic-bezier(.2,.8,.2,1);
          transform-origin: 100px 100px;
        }
        .core :global(.hub) {
          fill: #0B0018;
          stroke: ${BG};
          stroke-width: 1.5;
          transition: fill .5s, stroke .5s, r .5s;
        }
        .core :global(.link) { transition: stroke .5s, opacity .5s; }

        .state-rest .core :global(.petal) { animation: breathe 5s ease-in-out infinite; }
        @keyframes breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.04); } }

        .state-scout .mote { background: ${ACCENT}; box-shadow: 0 0 12px rgba(164,110,219,0.45); transform: scale(1.4); }
        .state-scout .r2   { border-color: rgba(164,110,219,0.35); }
        .state-scout .core { transform: scale(1.02); }

        .state-reason .core :global(.hub)   { fill: ${ACCENT}; stroke: ${ACCENT}; }
        .state-reason .core :global(.halo)  { opacity: 0.95; }
        .state-reason .core :global(.link)  { stroke: ${ACCENT}; opacity: 0.8; }
        .state-reason .core { transform: scale(1.03); }
        .state-reason .core :global(.petal) { transform: scale(0.94); }
        .state-reason .r3 { border-color: ${ACCENT}; box-shadow: 0 0 24px rgba(164,110,219,0.45) inset; }

        .state-execute .core :global(.petal) { fill: ${ACCENT}; animation: exec-pulse 1.1s ease-in-out infinite; }
        .state-execute .core :global(.hub)   { fill: ${BG}; stroke: ${BG}; }
        .state-execute .core :global(.link)  { stroke: ${BG}; opacity: 1; }
        .state-execute .r1   { border-color: rgba(164,110,219,0.5); transform: scale(1.04); }
        .state-execute .mote { background: ${ACCENT}; box-shadow: 0 0 16px rgba(164,110,219,0.45); }
        @keyframes exec-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }

        .state-report .core :global(.petal) { fill: ${BG}; }
        .state-report .core :global(.hub)   { fill: ${ACCENT}; stroke: ${ACCENT}; r: 18; }
        .state-report .r1 { transform: scale(1.03); }

        .orb-legend {
          position: absolute;
          bottom: -36px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          letter-spacing: 0.01em;
          color: ${BG};
          white-space: nowrap;
        }
        .ld {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: ${ACCENT};
          box-shadow: 0 0 0 4px rgba(164,110,219,0.25);
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Count-up metric
// ─────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isFinite(target)) { setVal(target); return; }
    let raf = 0;
    let started = false;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started) {
        started = true;
        const startTime = performance.now();
        const tick = (t: number) => {
          const p = Math.min(1, (t - startTime) / duration);
          const eased = 1 - Math.pow(1 - p, 3);
          setVal(target * eased);
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => { cancelAnimationFrame(raf); obs.disconnect(); };
  }, [target, duration]);
  return [ref, val] as const;
}

function MetricBlock({ value, decimals, unit, label, arrow, first, last }: {
  value: number; decimals: number; unit: string; label: string; arrow?: string; first?: boolean; last?: boolean;
}) {
  const [ref, current] = useCountUp(value);
  const display = isFinite(value) ? current.toFixed(decimals) : "∞";
  return (
    <div
      ref={ref}
      className="px-[22px] py-7"
      style={{
        borderRight: last ? "none" : `1px solid ${LINE}`,
        borderLeft: first ? "none" : "transparent",
      }}
    >
      <div className="tickup text-[42px] leading-[1] tracking-[-0.035em] font-medium" style={{ color: TEXT }}>
        {display}
        {unit && <span className="ml-1.5 text-[18px]" style={{ color: MID, fontWeight: 400 }}>{unit}</span>}
      </div>
      <div className="mt-3.5 text-[11px] uppercase tracking-[0.14em]" style={{ color: MID }}>
        {label}
        {arrow && <span className="ml-2" style={{ color: ACCENT }}>{arrow}</span>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Small primitives
// ─────────────────────────────────────────────────────────
function CloverMark() {
  return (
    <span
      className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg"
      style={{ background: ACCENT }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <circle cx="8"  cy="8"  r="3.5" fill={BG} />
        <circle cx="16" cy="8"  r="3.5" fill={BG} opacity="0.85" />
        <circle cx="8"  cy="16" r="3.5" fill={BG} opacity="0.85" />
        <circle cx="16" cy="16" r="3.5" fill={BG} opacity="0.7" />
      </svg>
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Dashboard preview
// ─────────────────────────────────────────────────────────
function DashBoard() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setActive(a => (a + 1) % 4), 1800);
    return () => clearInterval(id);
  }, []);

  const nodes = [
    { l: 20,  t: 60,  k: "trigger",       v: "Daily / 09:00" },
    { l: 220, t: 170, k: "reason",        v: "Best APY scan" },
    { l: 390, t: 290, k: "compare",       v: "Morpho vs Aave" },
    { l: 470, t: 410, k: "execute",       v: "Morpho deposit" },
  ];

  const edges = [
    { from: 0, to: 1 },
    { from: 1, to: 2 },
    { from: 2, to: 3 },
  ];

  const isEdgeActive = (e: { from: number; to: number }) => e.to === active || e.from === active;

  return (
    <div className="relative mt-12 h-[520px] w-full" style={{ background: BG_2, border: `1px solid ${LINE_MID}`, borderRadius: 14, overflow: "hidden" }}>
      <svg viewBox="0 0 600 520" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full">
        {edges.map((e, i) => {
          const a = nodes[e.from], b = nodes[e.to];
          const x1 = a.l + 130, y1 = a.t + 22;
          const x2 = b.l, y2 = b.t + 22;
          const mx = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          const live = isEdgeActive(e);
          return (
            <path
              key={i}
              d={d}
              stroke={live ? ACCENT : LINE_MID}
              strokeWidth={live ? 1.5 : 0.8}
              fill="none"
              strokeDasharray={live ? undefined : "4 6"}
              style={{ transition: "stroke .4s, stroke-width .4s" }}
            />
          );
        })}
      </svg>
      {nodes.map((n, i) => {
        const isActive = i === active;
        return (
          <div
            key={i}
            className="absolute flex items-start gap-2 border px-3.5 py-2.5 text-[13px] font-medium tracking-[-0.005em]"
            style={{
              left: n.l, top: n.t,
              background: isActive ? ACCENT : BG_3,
              borderColor: isActive ? ACCENT : LINE_MID,
              color: isActive ? BG : TEXT,
              borderRadius: 8,
              transition: "background .35s cubic-bezier(.2,.8,.2,1), transform .35s, box-shadow .35s",
              transform: isActive ? "translateY(-3px)" : "translateY(0)",
              boxShadow: isActive ? "0 14px 30px -14px rgba(164,110,219,0.5)" : "none",
            }}
          >
            <span
              className="mt-1.5 h-[7px] w-[7px] rounded-full flex-shrink-0"
              style={{
                background: isActive ? BG : MID,
                animation: isActive ? "pulse-dot 1.4s ease-in-out infinite" : "none",
              }}
            />
            <div>
              <small
                className="block text-[10px] font-medium uppercase tracking-[0.1em] mb-0.5"
                style={{ color: isActive ? "#1A0033" : MID }}
              >
                {n.k}
              </small>
              {n.v}
            </div>
          </div>
        );
      })}
    </div>
  );
}
