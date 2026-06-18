"use client";

import { PrivyProvider as Privy } from "@privy-io/react-auth";
import { sepolia } from "viem/chains";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useEffect, useRef } from "react";
import { metamaskStore } from "@/lib/web3/metamaskStore";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID || "";

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  return (
    <Privy
      appId={PRIVY_APP_ID}
      config={{
        appearance: {
          theme: "dark",
          accentColor: "#A46EDB",
        },
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
        },
        defaultChain: sepolia,
        supportedChains: [sepolia],
        loginMethods: ["wallet", "email", "google", "twitter", "discord", "github"],
      }}
    >
      <PrivySync />
      {children}
    </Privy>
  );
}

function PrivySync() {
  const { ready, authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const synced = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (authenticated && user && wallets.length > 0) {
      const wallet = wallets[0];
      const address = wallet.address.toLowerCase() as `0x${string}`;
      metamaskStore.applyPrivySession({ address, wallet, authenticated: true });
      synced.current = true;
    } else if (ready && !authenticated) {
      metamaskStore.applyPrivySession(null);
      synced.current = false;
    }
  }, [ready, authenticated, user, wallets]);

  return null;
}
