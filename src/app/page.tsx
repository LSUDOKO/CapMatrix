"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

const AGENTS = [
  {
    id: "scout",
    title: "Scout Agents",
    subtitle: "Market Intelligence Gatherers",
    img: "/images/AGENTS_PHOTOS/SCOUTAGENT.png",
    accent: "#3B5BFF",
    phase: "01",
    body: "They operate exclusively in a read-only capacity. Running discovery tools like checkYields and checkWhaleTrades, they scrape real-time market data and compile everything into an IntelligencePayload that gets written directly to the team's shared memory. Scouts never touch capital — they only gather signal.",
  },
  {
    id: "analyzer",
    title: "Conviction Analyzer",
    subtitle: "Sentiment & Strategy Analyst",
    img: "/images/AGENTS_PHOTOS/CONV ANALAZYER.png",
    accent: "#B6509E",
    phase: "02",
    body: "It joins the Scouts in the initial intelligence phase, analyzing market metrics and cross-referencing findings to formulate data-driven strategy assessments. The Conviction Analyzer ensures that no capital moves without a clear, quantitatively-backed rationale behind it.",
  },
  {
    id: "risk",
    title: "Risk Monitor",
    subtitle: "System Gatekeeper & Compliance Enforcer",
    img: "/images/AGENTS_PHOTOS/RISKMONITOR.png",
    accent: "#FF5A1F",
    phase: "03",
    body: "Armed with the checkRisk tool, it evaluates every proposed action and outputs a DecisionPayload. It has three ultimate powers: VETO to block execution entirely, SHRINK to halve positions on Medium Risk, and REVOKE to trigger an on-chain emergency transaction that strips a spending worker of its capital allowance — all without human intervention.",
  },
  {
    id: "executor",
    title: "Executor Agents",
    subtitle: "Action Takers",
    img: "/images/AGENTS_PHOTOS/EXECUTORAGENT.png",
    accent: "#A46EDB",
    phase: "04",
    body: "Sitting at the final phase of the pipeline, Executors receive the vetted context from the Risk Monitor and call transaction-heavy tools like executeDefi or executeCopyTrade to deploy capital on-chain. Once complete, they trigger a notifyUser event that pushes detailed reports to your dashboard or Telegram.",
  },
];

export default function LandingPage() {
  const [activeAgent, setActiveAgent] = useState(0);
  const agentRefs = useRef<(HTMLDivElement | null)[]>([]);

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
        const idx = Number(best.target.getAttribute("data-agent-idx"));
        if (!isNaN(idx)) setActiveAgent(idx);
      },
      { threshold: [0.3, 0.55, 0.8], rootMargin: "-20% 0px -20% 0px" },
    );

    agentRefs.current.forEach((el) => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, []);

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
          { name: "Agents",  url: "#agents",   icon: Brain },
          { name: "Builder", url: "#builder",  icon: LayoutGrid },
        ]}
      />

      {/* Hero */}
      <FUIHeroWithBorders />

      {/* Agents section — one-by-one vertical pipeline */}
      <section id="agents" className="px-7 py-[120px] overflow-hidden"
        style={{ background: "linear-gradient(to bottom, #000, #0B0018)" }}
      >
        <div className="mx-auto max-w-[1100px]">
          <div className="text-[11px] uppercase tracking-[0.18em] mb-3 text-center" style={{ color: MID }}>
            The agent pipeline
          </div>
          <h2 className="m-0 mb-6 text-[clamp(40px,5.4vw,84px)] font-medium leading-[0.96] tracking-[-0.035em] text-center mx-auto" style={{ color: TEXT }}>
            Four agents.{" "}
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400, color: ACCENT }}>One pipeline</span>
            .
          </h2>
          <p className="mx-auto mb-20 max-w-[64ch] text-center text-[16px] leading-[1.6]" style={{ color: TEXT_2 }}>
            Every CapMatrix workflow deploys a coordinated team of specialized AI agents. Each agent has exactly one job — from intelligence gathering to on-chain execution — and every job fits into a single automated pipeline.
          </p>

          {/* Pipeline progress indicator */}
          <div className="flex justify-center gap-2 mb-16">
            {AGENTS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: i === activeAgent ? 40 : 16,
                  background: i <= activeAgent ? ACCENT : LINE_MID,
                }}
              />
            ))}
          </div>

          {/* Agents */}
          {AGENTS.map((agent, i) => {
            const isActive = i === activeAgent;
            const isPast = i < activeAgent;
            return (
              <div
                key={agent.id}
                ref={(el) => { agentRefs.current[i] = el; }}
                data-agent-idx={i}
                className="relative mb-24 last:mb-0"
              >
                {/* Pipeline connector */}
                {i > 0 && (
                  <div
                    className="absolute left-1/2 -top-12 w-px h-12 -translate-x-1/2"
                    style={{
                      background: `linear-gradient(to bottom, ${isPast || isActive ? ACCENT : LINE_MID}, transparent)`,
                      opacity: isPast || isActive ? 1 : 0.3,
                      transition: "opacity 0.6s",
                    }}
                  />
                )}

                <div
                  className="flex flex-col md:flex-row items-center gap-8 md:gap-12 transition-all duration-700"
                  style={{
                    opacity: isActive ? 1 : isPast ? 0.5 : 0.3,
                    transform: isActive ? "translateY(0)" : "translateY(10px)",
                  }}
                >
                  {/* Phase number */}
                  <div
                    className="hidden md:flex items-center justify-center shrink-0 rounded-full text-lg font-bold tracking-wide"
                    style={{
                      width: 64, height: 64,
                      background: isActive ? ACCENT : BG_3,
                      color: isActive ? BG : MID_2,
                      border: `2px solid ${isActive ? ACCENT : LINE_MID}`,
                      boxShadow: isActive ? `0 0 30px -6px ${ACCENT_GLOW}` : "none",
                      transition: "all 0.6s",
                    }}
                  >
                    {agent.phase}
                  </div>

                  {/* Image */}
                  <div
                    className="w-full md:w-[280px] shrink-0 overflow-hidden rounded-xl"
                    style={{
                      border: `1px solid ${isActive ? agent.accent + "55" : LINE_MID}`,
                      boxShadow: isActive ? `0 0 40px -12px ${agent.accent}44` : "none",
                      transition: "all 0.6s",
                    }}
                  >
                    <img
                      src={agent.img}
                      alt={agent.title}
                      className="w-full h-full object-cover transition-transform duration-700"
                      style={{ minHeight: 260, maxHeight: 300 }}
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 mb-3">
                      <span
                        className="inline-block w-2 h-2 rounded-full"
                        style={{ background: agent.accent, boxShadow: `0 0 8px ${agent.accent}66` }}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: agent.accent }}>
                        Phase {agent.phase}
                      </span>
                    </div>
                    <h3 className="m-0 mb-1 text-[28px] font-semibold tracking-[-0.02em]" style={{ color: TEXT }}>
                      {agent.title}
                    </h3>
                    <div className="mb-4 text-[13px] font-medium italic tracking-[-0.01em]" style={{ color: agent.accent }}>
                      {agent.subtitle}
                    </div>
                    <p className="m-0 text-[15px] leading-[1.75]" style={{ color: TEXT_2 }}>
                      {agent.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Builder section */}
      <section id="builder"
        className="relative overflow-hidden px-7 pb-[160px] pt-[140px]"
        style={{ background: "linear-gradient(to bottom, #000, #0B0018)", color: TEXT }}
      >
        <div className="mx-auto max-w-[1320px]">
          <div className="mb-3 text-[11px] uppercase tracking-[0.18em]" style={{ color: MID }}>
            Workflow Builder
          </div>
          <h2 className="m-0 max-w-[18ch] text-[clamp(40px,5.4vw,84px)] font-medium leading-[0.96] tracking-[-0.035em]">
            A canvas for{" "}
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>agents</span>.
          </h2>
          <p className="mt-6 max-w-[60ch] text-[18px] leading-[1.55]" style={{ color: TEXT_2 }}>
            Visual node graph for every strategy. Define pipelines by connecting Scout → Analyzer → Risk Monitor → Executor. Watch your agents reason, decide, and execute — all through Band-powered chat rooms.
          </p>

          <DashBoard />

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
          Agents that{" "}
          <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", color: ACCENT }}>collaborate</span>.
        </h2>
        <p className="mx-auto mb-11 max-w-[48ch] text-[18px] leading-[1.5]" style={{ color: TEXT_2 }}>
          Built for the Band of Agents hackathon. Multi-agent DeFi workflows powered by Band chat rooms, Featherless AI, and on-chain execution.
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
            Explore workflows
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-7 py-[60px]" style={{ borderColor: LINE, background: BG }}>
        <div className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-10">
          <div>
            <div className="flex items-center gap-2.5 text-[18px] font-semibold tracking-[-0.01em]" style={{ color: TEXT }}>
              <CapMatrixMark /> CapMatrix
            </div>
            <p className="mt-3 max-w-[32ch] text-[13px] leading-[1.55]" style={{ color: MID }}>
              Multi-agent DeFi orchestration. Built for the Band of Agents hackathon. Powered by Band, Featherless AI, and on-chain execution.
            </p>
          </div>
          <div className="flex flex-wrap gap-[60px]">
            {([
              { h: "Product", items: [
                { label: "Dashboard", href: "/dashboard" },
                { label: "Marketplace", href: "/marketplace" },
                { label: "Documentation", href: "https://github.com" },
              ]},
              { h: "Hackathon", items: [
                { label: "Band of Agents", href: "https://band.ai" },
                { label: "Featherless AI", href: "https://featherless.ai" },
                { label: "AI/ML API", href: "https://aimlapi.com" },
              ]},
              { h: "Connect", items: [
                { label: "GitHub", href: "https://github.com" },
                { label: "Twitter", href: "https://twitter.com" },
                { label: "Contact", href: "mailto:hi@capmatrix.dev" },
              ]},
            ] as Array<{ h: string; items: { label: string; href: string }[] }>).map((col) => (
              <div key={col.h}>
                <h6 className="m-0 mb-3.5 text-[11px] font-medium uppercase tracking-[0.14em]" style={{ color: MID }}>
                  {col.h}
                </h6>
                {col.items.map((a) => (
                  <a key={a.label} className="block py-1 text-[14px] transition"
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
        <div className="mx-auto mt-12 flex max-w-[1320px] items-center justify-between border-t pt-7 text-[12px] tracking-[0.04em]"
          style={{ borderColor: LINE, color: MID }}
        >
          <span>© CapMatrix 2026 — Built for Band of Agents Hackathon.</span>
          <span>v0.1</span>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Logo mark
// ─────────────────────────────────────────────────────────
function CapMatrixMark() {
  return (
    <span
      className="inline-flex h-[30px] w-[30px] items-center justify-center rounded-lg overflow-hidden"
      style={{ background: "transparent" }}
    >
      <img
        src="/images/logo.png"
        alt="CapMatrix"
        className="h-full w-full object-contain"
      />
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Dashboard preview
// ─────────────────────────────────────────────────────────
function DashBoard() {
  const [active, setActive] = useState(0);
  const [dataIdx, setDataIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setActive(a => (a + 1) % 4);
      setDataIdx(d => (d + 1) % 4);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const agentIcons = [
    <svg key="s" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
    <svg key="a" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
    <svg key="r" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
    <svg key="e" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
  ];

  const agents = [
    { name: "Scout", role: "Market Intelligence", color: "#818cf8", apy: "48.51% APY", protocol: "Aerodrome" },
    { name: "Conviction Analyzer", role: "Signal Processing", color: "#a78bfa", conviction: "HIGH", signal: "+2.3σ" },
    { name: "Risk Monitor", role: "Sentinel", color: "#f59e0b", risk: "LOW", score: "12/100" },
    { name: "Executor", role: "On-chain Deploy", color: "#22c55e", amount: "5,000 USDC", tx: "0x8f3a…b1e9" },
  ];

  const pos = [
    { l: 30,  t: 70  },
    { l: 200, t: 180 },
    { l: 340, t: 290 },
    { l: 420, t: 400 },
  ];

  const steps = [
    { label: "Scanning", detail: "Aerodrome Slipstream", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
    { label: "Analyzing", detail: "Conviction +2.3σ",    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
    { label: "Vetting",   detail: "Risk score 12/100",     icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
    { label: "Executing", detail: "5,000 USDC → Aave v3", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg> },
  ];

  return (
    <div className="relative mt-12 h-[560px] w-full" style={{ background: "linear-gradient(145deg, #05000A 0%, #0F0020 40%, #000 100%)", border: `1px solid ${LINE_MID}`, borderRadius: 16, overflow: "hidden" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 18px", borderBottom: `1px solid rgba(164,110,219,0.08)`, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,0.5)" }} />
        <span style={{ fontSize: 12, color: TEXT_2, fontWeight: 500, letterSpacing: "-0.005em" }}>capmatrix · workflow</span>
        <span style={{ fontSize: 10, color: MID, letterSpacing: "0.08em" }}>/</span>
        <span style={{ fontSize: 12, color: TEXT, letterSpacing: "-0.005em" }}>yield-optimizer-v2</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: MID, display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT }} />
          4 agents
        </span>
        <span style={{ fontSize: 10, color: "#22c55e", display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#22c55e" }} />
          live
        </span>
      </div>

      {/* Flow status bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 18px", borderBottom: `1px solid rgba(164,110,219,0.06)`, background: "rgba(164,110,219,0.03)" }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, opacity: i <= active ? 1 : 0.35, transition: "opacity .4s" }}>
            {i > 0 && <div style={{ width: 16, height: 1, background: i <= active ? ACCENT : LINE }} />}
            {s.icon}
            <span style={{ fontSize: 11, color: i <= active ? TEXT : MID, fontWeight: i === active ? 600 : 400, transition: "color .4s" }}>{s.label}</span>
            <span style={{ fontSize: 10, color: i === active ? ACCENT : MID, transition: "color .4s" }}>{s.detail}</span>
          </div>
        ))}
        {active >= 3 && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8, padding: "2px 8px", borderRadius: 4, background: "rgba(34,197,94,0.1)", color: "#22c55e", fontSize: 10, fontWeight: 600, animation: "clove-fade-in 0.3s" }}>Deployed ✓</span>
        )}
      </div>

      {/* SVG edges */}
      <svg viewBox="0 0 580 560" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 h-full w-full" style={{ padding: "0 10px" }}>
        <defs>
          <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.6" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0.15" />
          </linearGradient>
        </defs>
        {pos.map((_, i) => {
          if (i >= pos.length - 1) return null;
          const a = pos[i], b = pos[i + 1];
          const x1 = a.l + 110, y1 = a.t + 48;
          const x2 = b.l,      y2 = b.t + 48;
          const mx = (x1 + x2) / 2 + 15;
          const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          const live = active > i;
          const now = i === active;
          return (
            <g key={i}>
              <path d={d} stroke={LINE_MID} strokeWidth="1" fill="none" strokeDasharray="4 5" opacity="0.4" />
              <path d={d} stroke={live || now ? agents[i].color : "transparent"} strokeWidth={now ? "2.5" : "1.5"} fill="none" strokeDasharray={now ? undefined : "none"} opacity={now ? 1 : 0.7} style={{ transition: "stroke .5s, stroke-width .3s" }} />
              {/* Animated dot */}
              {now && (
                <circle r="4" fill={agents[i].color} filter="url(#glow)">
                  <animateMotion dur="1.2s" repeatCount="indefinite" path={d} />
                </circle>
              )}
            </g>
          );
        })}
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </svg>

      {/* Agent nodes */}
      {agents.map((a, i) => {
        const isActive = i === active;
        return (
          <div
            key={i}
            className="absolute flex flex-col border"
            style={{
              left: pos[i].l, top: pos[i].t,
              width: 140,
              background: isActive ? `linear-gradient(145deg, ${a.color}15, ${a.color}08)` : BG_3,
              borderColor: isActive ? a.color + "66" : LINE_MID,
              borderRadius: 12,
              transition: "all .4s cubic-bezier(.2,.8,.2,1)",
              transform: isActive ? "translateY(-4px) scale(1.02)" : "translateY(0) scale(1)",
              boxShadow: isActive ? `0 20px 40px -16px ${a.color}60` : "none",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px 0" }}>
              <span style={{ display: "inline-flex", width: 28, height: 28, alignItems: "center", justifyContent: "center", borderRadius: 8, background: a.color + "20", color: a.color }}>
                {agentIcons[i]}
              </span>
              <div>
                <div style={{ fontSize: 13, color: isActive ? TEXT : TEXT_2, fontWeight: 600, letterSpacing: "-0.01em" }}>{a.name}</div>
                <div style={{ fontSize: 9.5, color: MID, letterSpacing: "0.04em", textTransform: "uppercase" }}>{a.role}</div>
              </div>
              {isActive && (
                <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: a.color, boxShadow: `0 0 10px ${a.color}` }} />
              )}
            </div>

            {/* Data row */}
            <div style={{ padding: "10px 14px 12px", fontSize: 11, color: TEXT_2, display: "flex", flexDirection: "column", gap: 4 }}>
              {a.apy && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MID }}>apy</span>
                  <span style={{ color: "#22c55e", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{a.apy}</span>
                </div>
              )}
              {a.protocol && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MID }}>protocol</span>
                  <span style={{ color: TEXT }}>{a.protocol}</span>
                </div>
              )}
              {a.conviction && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MID }}>conviction</span>
                  <span style={{ color: a.color, fontWeight: 600 }}>{a.conviction}</span>
                </div>
              )}
              {a.signal && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MID }}>signal</span>
                  <span style={{ color: TEXT, fontVariantNumeric: "tabular-nums" }}>{a.signal}</span>
                </div>
              )}
              {a.risk !== undefined && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MID }}>risk</span>
                  <span style={{ color: a.risk === "LOW" ? "#22c55e" : "#f59e0b", fontWeight: 600 }}>{a.risk}</span>
                </div>
              )}
              {a.score && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MID }}>score</span>
                  <span style={{ color: TEXT, fontVariantNumeric: "tabular-nums" }}>{a.score}</span>
                </div>
              )}
              {a.amount && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MID }}>allocation</span>
                  <span style={{ color: TEXT, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{a.amount}</span>
                </div>
              )}
              {a.tx && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: MID }}>tx</span>
                  <span style={{ color: TEXT, fontFamily: "monospace", fontSize: 10 }}>{a.tx}</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Bottom bar */}
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", alignItems: "center", gap: 12, padding: "10px 18px", borderTop: `1px solid rgba(164,110,219,0.06)`, background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span style={{ fontSize: 11, color: "#22c55e", fontWeight: 500 }}>Workflow completed</span>
        <span style={{ fontSize: 10, color: MID }}>· 1.2s total · Band room: <span style={{ fontFamily: "monospace", color: TEXT_2 }}>bf24b14d</span></span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 10, color: MID }}>powered by Band AI · Featherless AI · Base Sepolia</span>
      </div>
    </div>
  );
}
