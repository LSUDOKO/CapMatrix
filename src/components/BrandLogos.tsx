import React from "react";

/**
 * Brand logo marks — self-contained inline SVG (no external CDN), brand-colored
 * so they read on the light "paper" theme. Sized 1em by default; pass `size`.
 * These are recognizable simplified marks; drop official SVGs into public/logos/
 * and swap the body if you want pixel-perfect brand assets.
 */
type P = { size?: number };
const box = (size = 18) => ({ width: size, height: size, display: "block" as const });

export function BaseLogo({ size = 18 }: P) {
  // Base: blue disc with a vertical white "slice" cut on the right.
  return (
    <svg viewBox="0 0 24 24" style={box(size)} aria-label="Base">
      <circle cx="12" cy="12" r="12" fill="#0052FF" />
      <path d="M11.6 3.2a8.8 8.8 0 1 0 0 17.6c4.3 0 7.9-3.1 8.7-7.2H9.2v-3.2h11.1A8.8 8.8 0 0 0 11.6 3.2Z" fill="#fff" />
    </svg>
  );
}

export function MetaMaskLogo({ size = 18 }: P) {
  // Wallet icon — abstract mark
  return (
    <svg viewBox="0 0 24 24" style={box(size)} aria-label="Wallet">
      <path d="M21.5 3 13.6 8.7l1.5-3.5L21.5 3Z" fill="#E2761B" />
      <path d="M2.5 3l7.8 5.8L8.9 5.2 2.5 3Z" fill="#E4761B" />
      <path d="M18.6 16.3l-2.1 3.2 4.5 1.3 1.3-4.4-3.7-.1ZM1.7 16.4 3 20.8l4.5-1.3-2.1-3.2-3.7.1Z" fill="#E4761B" />
      <path d="M7.3 10.6 6 12.6l4.4.2-.15-4.8-2.95 2.6ZM16.7 10.6l-3-2.65-.1 4.85 4.4-.2-1.3-2Z" fill="#763D16" />
      <path d="m7.5 19.5 2.7-1.3-2.3-1.8-.4 3.1ZM13.8 18.2l2.7 1.3-.4-3.1-2.3 1.8Z" fill="#F6851B" />
    </svg>
  );
}

export function UniswapLogo({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" style={box(size)} aria-label="Uniswap">
      <circle cx="12" cy="12" r="12" fill="#FF007A" />
      <path d="M9 6c2.2.3 3.4 1.6 3.9 3.4.3 1.2.1 2.2-.4 3.1.7.2 1.3.6 1.7 1.3.6 1 .5 2.2-.1 3.4-.3-.9-.8-1.5-1.5-1.8.2 1 .1 1.9-.5 2.6-.2-1.2-.8-2-1.8-2.5-1.4-.7-2.1-1.6-2.1-3 0-.7.2-1.2.6-1.7-.6-.2-1-.6-1.3-1.2-.4-.9-.2-1.9.3-2.9.2.8.6 1.4 1.3 1.7-.2-.9-.1-1.7.3-2.5.1.9.6 1.6 1.5 2-.6-.6-.9-1.4-.9-2.2 0-.4.1-.8.3-1.2L9 6Z" fill="#fff" />
    </svg>
  );
}

export function AaveLogo({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" style={box(size)} aria-label="Aave">
      <circle cx="12" cy="12" r="12" fill="#B6509E" />
      <path d="M12 5.5 17.2 18h-2.1l-1-2.6h-4.2L8.9 18H6.8L12 5.5Zm0 4.3-1.5 3.9h3L12 9.8Z" fill="#fff" />
      <circle cx="12" cy="9" r="0.9" fill="#fff" />
    </svg>
  );
}

export function MorphoLogo({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" style={box(size)} aria-label="Morpho">
      <circle cx="12" cy="12" r="12" fill="#2C2F36" />
      <path d="M6 17V8.2c0-.5.6-.8 1-.5L12 11l5-3.3c.4-.3 1 0 1 .5V17h-2.1v-6.1L12 13.4 8.1 10.9V17H6Z" fill="#5792FF" />
    </svg>
  );
}

export function AerodromeLogo({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" style={box(size)} aria-label="Aerodrome">
      <circle cx="12" cy="12" r="12" fill="#0F62FE" />
      <path d="M12 5 19 18h-3.2l-1-2H10.2l-1 2H6L12 5Zm0 5.3-1.2 2.4h2.4L12 10.3Z" fill="#fff" />
    </svg>
  );
}

export function LidoLogo({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" style={box(size)} aria-label="Lido">
      <circle cx="12" cy="12" r="12" fill="#00A3FF" />
      <path d="M12 4.5 16 11l-4 2.4L8 11l4-6.5Z" fill="#fff" />
      <path d="M8.2 12.4 12 14.7l3.8-2.3.5.8c1 1.6.6 3.7-1 4.9a4.3 4.3 0 0 1-5 0c-1.6-1.2-2-3.3-1-4.9l.4-.8Z" fill="#fff" opacity="0.75" />
    </svg>
  );
}

export function VeniceLogo({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" style={box(size)} aria-label="Featherless AI">
      <circle cx="12" cy="12" r="12" fill="#FF5A1F" />
      <path d="M6 7.5h2.4L12 15l3.6-7.5H18L12.9 17h-1.8L6 7.5Z" fill="#fff" />
    </svg>
  );
}

export function OneShotLogo({ size = 18 }: P) {
  return (
    <svg viewBox="0 0 24 24" style={box(size)} aria-label="Execution Engine">
      <circle cx="12" cy="12" r="12" fill="#0B0C09" />
      <circle cx="12" cy="12" r="6" fill="#C8FF3D" />
      <path d="M9.5 12h5m0 0-2-2m2 2-2 2" stroke="#0B0C09" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
