import type { Metadata } from "next";
import { Spectral, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { WalletAutoInit } from "@/components/WalletAutoInit";
import { PrivyProvider } from "@/lib/auth/PrivyProvider";

// Editorial type system (per the design handoff):
//   Spectral — display, headings, agent names, stat numbers (+ deliberate italics)
//   Hanken Grotesk — body, buttons, nav, lists
//   JetBrains Mono — micro-labels, status tags, breadcrumbs
const spectral = Spectral({
  variable: "--font-spectral",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "CapMatrix — Band AI Hackathon · Multi-Agent DeFi on Base",
  description:
    "CapMatrix is a Band-powered multi-agent orchestration platform for DeFi on Base. Scouts research, Risk Monitors enforce caps, and Executors trade — all coordinated through Band chat rooms. Built for the Band AI Hackathon.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spectral.variable} ${hanken.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WalletAutoInit />
        <PrivyProvider>
          {children}
        </PrivyProvider>
      </body>
    </html>
  );
}
