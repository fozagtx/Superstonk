"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { Share2, TriangleAlert } from "lucide-react";
import { AppWalletProvider } from "@/components/wallet-provider";
import { SiteHeader } from "@/components/site-header";
import { StaleBanner } from "@/components/stale-banner";
import { VerdictChip } from "@/components/verdict-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { fmtPct, fmtTokens, fmtUsd } from "@/lib/format";
import type { Verdict, ExitRiskTier } from "@/lib/metrics";

interface Position {
  mint: string;
  symbol: string;
  name: string;
  image: string;
  amount: number;
  tokenPrice: number;
  markPrice: number;
  premiumPct: number;
  verdict: Verdict;
  value: number;
  fairValue: number;
  hiddenPremium: number;
  exitShare: number;
  exitTier: ExitRiskTier;
}

interface HoldingsResponse {
  owner: string;
  positions: Position[];
  totalValue: number;
  totalFairValue: number;
  totalHiddenPremium: number;
  source: "live" | "snapshot";
  updatedAt: string;
  error?: string;
}

const tierStyles: Record<ExitRiskTier, string> = {
  low: "var(--discount)",
  medium: "var(--warning)",
  high: "var(--overpriced)",
};

function MyXRay() {
  const { publicKey } = useWallet();
  const [addressInput, setAddressInput] = useState("");
  const [owner, setOwner] = useState<string | null>(null);
  const [data, setData] = useState<HoldingsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (address: string) => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(
        `/api/holdings?owner=${encodeURIComponent(address)}`,
      );
      const body = (await res.json()) as HoldingsResponse;
      if (!res.ok) {
        setError(
          res.status === 400
            ? "That doesn't look like a valid Solana address. Check for typos and try again."
            : body.error ||
                "Couldn't load holdings right now. The RPC may be rate-limited — try again in a moment.",
        );
        return;
      }
      setData(body);
    } catch {
      setError(
        "Couldn't reach the server. Check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (publicKey) {
      const addr = publicKey.toBase58();
      void (async () => {
        setOwner(addr);
        await load(addr);
      })();
    }
  }, [publicKey, load]);

  const submitAddress = () => {
    const trimmed = addressInput.trim();
    try {
      new PublicKey(trimmed);
    } catch {
      setError(
        "That doesn't look like a valid Solana address. Check for typos and try again.",
      );
      return;
    }
    setOwner(trimmed);
    void load(trimmed);
  };

  const fairShare =
    data && data.totalValue > 0 ? data.totalFairValue / data.totalValue : 0;
  const premiumShare = 1 - fairShare;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <h1 className="mb-1 text-xl font-bold">My X-Ray</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          We never ask you to sign anything.
        </p>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <WalletMultiButton
            style={{
              height: "2rem",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--accent)",
              fontSize: "0.875rem",
              padding: "0 0.75rem",
            }}
          >
            View my holdings (read-only)
          </WalletMultiButton>
        </div>
        <div className="mb-8 flex gap-2">
          <Input
            placeholder="Or paste any Solana address"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitAddress()}
            className="num max-w-md"
            spellCheck={false}
          />
          <Button
            variant="outline"
            onClick={submitAddress}
            disabled={!addressInput.trim() || loading}
          >
            Check
          </Button>
        </div>

        {error && (
          <div
            className="mb-6 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm"
            style={{
              color: "var(--overpriced)",
              borderColor:
                "color-mix(in oklch, var(--overpriced) 40%, transparent)",
              backgroundColor:
                "color-mix(in oklch, var(--overpriced) 10%, transparent)",
            }}
            role="alert"
          >
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-3 w-40" />
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        )}

        {data && !loading && (
          <>
            {data.source === "snapshot" && (
              <div className="mb-4">
                <StaleBanner />
              </div>
            )}
            {data.positions.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-sm text-muted-foreground">
                  No PreStocks tokens found in{" "}
                  <span className="num break-all text-foreground">
                    {data.owner}
                  </span>
                  .{" "}
                  <Link href="/" className="text-primary underline">
                    Browse the leaderboard
                  </Link>{" "}
                  to see what you&apos;re missing.
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="mb-4">
                  <CardContent className="pt-6">
                    <div className="mb-1 text-xs text-muted-foreground">
                      Total value
                    </div>
                    <div className="num mb-2 text-4xl font-medium">
                      {fmtUsd(data.totalValue)}
                    </div>
                    <div className="mb-1 text-sm text-muted-foreground">
                      Fair value{" "}
                      <span className="num text-foreground">
                        {fmtUsd(data.totalFairValue)}
                      </span>
                    </div>
                    <p className="mb-4 text-sm">
                      {data.totalHiddenPremium >= 0 ? (
                        <>
                          <span className="num font-medium">
                            {fmtUsd(data.totalHiddenPremium)}
                          </span>{" "}
                          of your{" "}
                          <span className="num font-medium">
                            {fmtUsd(data.totalValue)}
                          </span>{" "}
                          is premium
                        </>
                      ) : (
                        <>
                          You&apos;re holding{" "}
                          <span className="num font-medium">
                            {fmtUsd(Math.abs(data.totalHiddenPremium))}
                          </span>{" "}
                          below fair value
                        </>
                      )}
                    </p>
                    <div
                      className="flex h-3 w-full overflow-hidden rounded-full"
                      role="img"
                      aria-label={`${Math.round(fairShare * 100)}% fair value, ${Math.round(premiumShare * 100)}% premium`}
                    >
                      <div
                        style={{
                          width: `${fairShare * 100}%`,
                          backgroundColor: "var(--discount)",
                        }}
                      />
                      <div
                        className="flex-1"
                        style={{ backgroundColor: "var(--overpriced)" }}
                      />
                    </div>
                    <div className="num mt-1.5 text-xs text-muted-foreground">
                      {Math.round(fairShare * 100)}% fair value ·{" "}
                      {Math.round(premiumShare * 100)}% hype
                    </div>
                  </CardContent>
                </Card>

                <ul className="mb-6 divide-y divide-border rounded-xl border border-border bg-card">
                  {data.positions.map((p) => (
                    <li key={p.mint} className="px-4 py-3.5">
                      <div className="mb-2 flex flex-wrap items-center gap-2.5">
                        <Link
                          href={`/token/${p.symbol}`}
                          className="font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <span className="num text-xs text-muted-foreground">
                          {fmtTokens(p.amount)} {p.symbol}
                        </span>
                        <span className="flex-1" />
                        <VerdictChip verdict={p.verdict} iconOnlyOnMobile />
                        <span
                          className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.04em]"
                          style={{
                            color: tierStyles[p.exitTier],
                            backgroundColor: `color-mix(in oklch, ${tierStyles[p.exitTier]} 12%, transparent)`,
                          }}
                        >
                          {p.exitTier} exit risk
                        </span>
                      </div>
                      <div className="num grid grid-cols-3 gap-2 text-sm sm:grid-cols-4">
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Value
                          </div>
                          {fmtUsd(p.value)}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Fair value
                          </div>
                          {fmtUsd(p.fairValue)}
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Hidden premium
                          </div>
                          <span
                            style={{
                              color:
                                p.hiddenPremium >= 0
                                  ? "var(--overpriced)"
                                  : "var(--discount)",
                            }}
                          >
                            {fmtUsd(p.hiddenPremium)}
                          </span>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">
                            Premium
                          </div>
                          {fmtPct(p.premiumPct)}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                {/* TODO(phase-2): share card / image generation */}
                <Button variant="outline" disabled>
                  <Share2 /> Share my X-Ray
                </Button>
              </>
            )}
          </>
        )}

        {!data && !loading && !error && !owner && (
          <p className="text-sm text-muted-foreground">
            Connect a wallet or paste an address to see what you actually own.
          </p>
        )}
      </main>
      <footer className="mx-auto flex w-full max-w-3xl justify-end px-4 pb-6 text-xs text-muted-foreground">
        <span>Data, not financial advice.</span>
      </footer>
    </>
  );
}

export default function MePage() {
  return (
    <AppWalletProvider>
      <MyXRay />
    </AppWalletProvider>
  );
}
