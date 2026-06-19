"use client";

import React, { useRef, useEffect } from "react";
import Link from "next/link";
import clsx from "clsx";

const POWERED_BY_LOGOS = [
  { src: "/images/band-logo-light.svg",   alt: "Band AI" },
  { src: "/images/aimlapi_logo.jpg",      alt: "AI/ML API" },
  { src: "/images/featherless-ai.svg",    alt: "Featherless AI" },
  { src: "/images/vercel.png",            alt: "Vercel" },
  { src: "/images/unisawp.png",           alt: "Uniswap" },
];

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
      {/* Large bottom globe/orb */}
      <div
        className="absolute left-1/2 top-[calc(100%-90px)] lg:top-[calc(100%-150px)] h-[500px] w-[700px] md:h-[500px] md:w-[1100px] lg:h-[750px] lg:w-[120%] -translate-x-1/2 rounded-[100%]"
        style={{
          border: "2px solid rgba(180,140,222,0.35)",
          background: "radial-gradient(closest-side, #200D42 30%, #000 60%, transparent 90%)",
          zIndex: 0,
        }}
      />

      {/* Three-column border grid */}
      <div className="hero-border-grid">
        <div className="col-span-1 flex h-full items-center justify-center" />
        <div className="col-span-1 flex h-full items-center justify-center" />
        <div className="col-span-1 flex h-full items-center justify-center" />
      </div>

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
              Band of Agents Hackathon · Multi-Agent DeFi · 2026
            </span>
          </div>
        </div>

        {/* Headline */}
        <div className="mx-auto flex h-[288px] max-w-[80vw] shrink-0 flex-col items-center justify-center gap-2 px-2 py-4 sm:px-10 lg:px-24">
          <h1 className="text-pretty text-center text-4xl font-medium leading-none tracking-[-1.44px] sm:text-5xl md:text-6xl lg:text-[clamp(50px,7vw,75px)] md:max-w-screen-lg md:tracking-[-2.16px]"
            style={{ color: "#F0EDF5" }}
          >
            Multi-agent{" "}
            <span style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontWeight: 400, color: "#A46EDB" }}>
              DeFi
            </span>
            , automated.
          </h1>
          <h2 className="max-w-2xl text-pretty text-center md:text-lg"
            style={{ color: "#8A7CB8" }}
          >
            CapMatrix orchestrates specialized AI agents through Band chat rooms — from market intelligence to
            on-chain execution. One pipeline. Zero manual intervention.
          </h2>
        </div>

        {/* CTA buttons */}
        <div className="flex items-start justify-center divide-y divide-white/10 px-8 sm:px-24">
          <div className="flex w-full max-w-[80vw] flex-col items-center justify-start md:max-w-[392px]">
            <Link href="/marketplace" className="w-full cursor-pointer">
              <div
                className={clsx(
                  "flex h-14 flex-col items-center justify-center rounded-none text-base",
                  "w-full backdrop-blur-xl transition-colors duration-150",
                  "border-x border-y-0 border-white/10",
                  "bg-transparent hover:bg-white/5 dark:hover:bg-white/5",
                )}
                style={{ color: "#b49de0" }}
              >
                Explore workflows
              </div>
            </Link>
            <Link href="/dashboard" className="w-full cursor-pointer">
              <div
                className={clsx(
                  "flex h-14 flex-col items-center justify-center rounded-none text-base font-medium",
                  "w-full border-[1.2px] border-white/5",
                  "bg-gradient-to-tr from-[#4F21A1] via-[#7B4FC4] to-[#A46EDB]",
                )}
                style={{ color: "#F0EDF5" }}
              >
                Launch pipeline <span className="ml-2" aria-hidden>↗</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Powered by — logo cloud with cursive labels */}
        <div className="mx-auto w-full max-w-7xl px-4 py-16 md:px-8">
          <div className="mb-6 text-center text-[11px] uppercase tracking-[0.18em]" style={{ color: "#8A7CB8" }}>
            Powered by
          </div>
          <div
            className="group relative mt-2 flex gap-10 overflow-hidden p-2"
            style={{
              maskImage: "linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%)",
              WebkitMaskImage: "linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 95%)",
            }}
          >
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="flex shrink-0 animate-x-slider flex-row justify-around gap-10"
              >
                {POWERED_BY_LOGOS.map((logo) => (
                  <div
                    key={`${idx}-${logo.alt}`}
                    className="flex flex-col items-center justify-center gap-2 w-28 flex-none px-2"
                  >
                    <img
                      src={logo.src}
                      alt={logo.alt}
                      className="h-8 w-auto md:h-10 object-contain"
                    />
                    <span
                      className="text-center leading-tight"
                      style={{
                        fontFamily: "var(--serif)",
                        fontStyle: "italic",
                        color: "#b49de0",
                        fontWeight: 500,
                        fontSize: "15px",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {logo.alt}
                    </span>
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
