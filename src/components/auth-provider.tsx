"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import {
  toSolanaWalletConnectors,
  useWallets,
} from "@privy-io/react-auth/solana";
import {
  createSolanaRpc,
  createSolanaRpcSubscriptions,
} from "@solana/kit";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? "";
const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ??
  "https://api.mainnet-beta.solana.com";

export interface AuthState {
  // Demo mode runs with no Privy: a single shared worker, no real signing.
  demo: boolean;
  ready: boolean;
  signedIn: boolean;
  walletAddress: string | null;
  login: () => void;
  logout: () => void;
  // fetch() wrapper that attaches the Privy bearer token when needed.
  apiFetch: (path: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthState>({
  demo: true,
  ready: true,
  signedIn: true,
  walletAddress: null,
  login: () => {},
  logout: () => {},
  apiFetch: (path, init) => fetch(path, init),
});

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

function DemoBridge({ children }: { children: ReactNode }) {
  const value = useMemo<AuthState>(
    () => ({
      demo: true,
      ready: true,
      signedIn: true,
      walletAddress: null,
      login: () => {},
      logout: () => {},
      apiFetch: (path, init) => fetch(path, init),
    }),
    [],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function PrivyBridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const apiFetch = useCallback(
    async (path: string, init: RequestInit = {}) => {
      const token = await getAccessToken();
      const headers = new Headers(init.headers);
      if (token) headers.set("authorization", `Bearer ${token}`);
      return fetch(path, { ...init, headers });
    },
    [getAccessToken],
  );

  const value = useMemo<AuthState>(
    () => ({
      demo: false,
      ready,
      signedIn: authenticated,
      walletAddress: wallets[0]?.address ?? null,
      login: () => login(),
      logout: () => void logout(),
      apiFetch,
    }),
    [ready, authenticated, wallets, login, logout, apiFetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) return <DemoBridge>{children}</DemoBridge>;
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "email", "wallet"],
        appearance: { walletChainType: "solana-only" },
        embeddedWallets: {
          solana: { createOnLogin: "users-without-wallets" },
        },
        externalWallets: {
          solana: { connectors: toSolanaWalletConnectors() },
        },
        solana: {
          rpcs: {
            "solana:mainnet": {
              rpc: createSolanaRpc(SOLANA_RPC_URL),
              rpcSubscriptions: createSolanaRpcSubscriptions(
                SOLANA_RPC_URL.replace("https://", "wss://"),
              ),
            },
          },
        },
      }}
    >
      <PrivyBridge>{children}</PrivyBridge>
    </PrivyProvider>
  );
}
