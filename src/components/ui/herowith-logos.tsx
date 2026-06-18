"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  MorphoLogo, AaveLogo, UniswapLogo, AerodromeLogo, LidoLogo,
  VeniceLogo, BaseLogo, MetaMaskLogo, OneShotLogo,
} from "@/components/BrandLogos";

const PROTOCOLS = [
  { name: "Morpho",     url: "Morpho",     color: "#3B5BFF" },
  { name: "Aave",       url: "Aave",       color: "#B6509E" },
  { name: "Uniswap",    url: "Uniswap",    color: "#FF007A" },
  { name: "Aerodrome",  url: "Aerodrome",  color: "#0F62FE" },
  { name: "Lido",       url: "Lido",       color: "#00A3FF" },
  { name: "Venice AI",  url: "Venice",     color: "#FF5A1F" },
  { name: "Base",       url: "Base",       color: "#0052FF" },
  { name: "MetaMask",   url: "MetaMask",   color: "#F6851B" },
  { name: "1Shot",      url: "1Shot",      color: "#A46EDB" },
];

const LOGO_MAP: Record<string, React.ReactNode> = {
  Morpho:    <MorphoLogo size={28} />,
  Aave:      <AaveLogo size={28} />,
  Uniswap:   <UniswapLogo size={28} />,
  Aerodrome: <AerodromeLogo size={28} />,
  Lido:      <LidoLogo size={28} />,
  Venice:    <VeniceLogo size={28} />,
  Base:      <BaseLogo size={28} />,
  MetaMask:  <MetaMaskLogo size={28} />,
  "1Shot":   <OneShotLogo size={28} />,
};

export default function FUIHeroWithBorders() {
  const bloomRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (bloomRef.current) {
        bloomRef.current.style.transform = `translate(${x - 300}px, ${y - 300}px)`;
      }
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen overflow-hidden"
      style={{
        background: "linear-gradient(to bottom, #000, #200D42 40%, #4F21A1 74%, #A46EDB 88%)",
      }}
    >
      {/* Large bottom purple glow */}
      <div
        className="absolute left-1/2 top-[calc(100%-90px)] lg:top-[calc(100%-150px)] h-[500px] w-[700px] md:h-[500px] md:w-[1100px] lg:h-[750px] lg:w-[120%] -translate-x-1/2 rounded-[100%]"
        style={{
          border: "1px solid rgba(180,140,222,0.15)",
          background: "radial-gradient(closest-side, #000 40%, #9560EB 70%, transparent)",
        }}
      />

      {/* Three-column border grid */}
      <div className="hero-border-grid" />

      {/* Ambient purple glows */}
      <figure
        className="pointer-events-none absolute -bottom-[70%] left-1/2 z-0 aspect-square w-[520px] -translate-x-1/2 rounded-full"
        style={{ background: "rgba(149,96,235,0.08)", filter: "blur(200px)" }}
      />
      <figure
        className="pointer-events-none absolute left-[4vw] top-[64px] z-20 hidden aspect-square w-[32vw] rounded-full opacity-50 md:block"
        style={{ background: "rgba(164,110,219,0.08)", filter: "blur(100px)" }}
      />
      <figure
        className="pointer-events-none absolute bottom-[-50px] right-[7vw] z-20 hidden aspect-square w-[30vw] rounded-full opacity-50 md:block"
        style={{ background: "rgba(164,110,219,0.06)", filter: "blur(100px)" }}
      />

      {/* Cursor-tracked bloom */}
      <div
        ref={bloomRef}
        className="pointer-events-none absolute z-10"
        style={{
          top: 0, left: 0, width: 600, height: 600,
          borderRadius: "50%",
          background: "radial-gradient(circle at center, rgba(164,110,219,0.1), transparent 60%)",
          filter: "blur(60px)",
          opacity: 0.6,
          mixBlendMode: "screen",
          transition: "transform 200ms ease-out",
          willChange: "transform",
        }}
      />

      <div className="relative z-10 flex flex-col pt-[35px]">
        {/* Live badge */}
        <div className="flex flex-col items-center justify-end">
          <div
            className="flex items-center gap-2 border border-b-0 px-4 py-2"
            style={{ borderColor: "rgba(180,140,222,0.15)", borderRadius: "8px 8px 0 0" }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#A46EDB", boxShadow: "0 0 0 4px rgba(164,110,219,0.25)" }}
            />
            <span className="text-xs tracking-tight" style={{ color: "#8A7CB8" }}>
              Live on Base mainnet · ERC-7715 · 1Shot Relayer
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="mx-auto flex h-[288px] max-w-[80vw] shrink-0 flex-col items-center justify-center gap-2 px-2 py-4 sm:px-10 lg:px-24">
          <h1 className="text-pretty text-center text-4xl font-medium leading-none tracking-[-1.44px] sm:text-5xl md:text-6xl lg:text-[clamp(50px,7vw,75px)] md:max-w-screen-lg md:tracking-[-2.16px]"
            style={{ color: "#F0EDF5" }}
          >
            Autonomous{" "}
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400, color: "#A46EDB" }}>
              capital
            </span>
            , quietly.
          </h1>
          <h2 className="max-w-2xl text-pretty text-center md:text-lg"
            style={{ color: "#8A7CB8" }}
          >
            Describe a strategy in plain English, grant one capped ERC-7715 budget, and a Fund Manager splits
            it across specialized AI agents that research, decide, and execute on-chain — gas paid in USDC.
          </h2>
        </div>

        {/* CTA buttons */}
        <div className="flex items-start justify-center px-8 sm:px-24">
          <div className="flex w-full max-w-[80vw] flex-col items-center justify-center md:max-w-[392px]">
            <Link href="/marketplace" className="w-full cursor-pointer">
              <div
                className={clsx(
                  "flex h-14 flex-col items-center justify-center rounded-none text-base",
                  "w-full border-x border-y-0 backdrop-blur-xl transition-colors duration-150 hover:bg-white/5",
                )}
                style={{
                  color: "#8A7CB8",
                  borderColor: "rgba(180,140,222,0.12)",
                  background: "transparent",
                }}
              >
                Explore strategies
              </div>
            </Link>
            <Link href="/dashboard" className="w-full cursor-pointer">
              <div
                className={clsx(
                  "flex h-14 flex-col items-center justify-center rounded-none text-base font-medium",
                  "w-full border-0",
                )}
                style={{
                  color: "#000",
                  background: "linear-gradient(to right, rgba(164,110,219,0.9), rgba(164,110,219,0.7))",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                Launch agent <span className="ml-1" aria-hidden>↗</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Logo cloud */}
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
          <div className="mb-6 text-center text-[11px] uppercase tracking-[0.18em]" style={{ color: "#8A7CB8" }}>
            Composed from
          </div>
          <div
            className="group relative mt-2 flex gap-6 overflow-hidden p-2"
            style={{
              maskImage: "linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%)",
            }}
          >
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="flex shrink-0 animate-x-slider flex-row justify-around gap-6"
              >
                {PROTOCOLS.map((p) => (
                  <div
                    key={p.name}
                    className="flex h-12 w-28 flex-none items-center justify-center gap-2.5 px-2 text-sm font-medium"
                    style={{ color: "#8A7CB8" }}
                  >
                    <span
                      className="flex items-center justify-center rounded-full"
                      style={{
                        width: 32, height: 32,
                        background: "rgba(255,255,255,0.04)",
                        boxShadow: `0 0 0 1px ${p.color}33`,
                      }}
                    >
                      {LOGO_MAP[p.url]}
                    </span>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
