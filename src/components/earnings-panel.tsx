"use client";

import { useEffect, useState } from "react";
import { ExternalLink, CircleDollarSign, Droplets } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtUsd } from "@/lib/format";

interface EarningsData {
  earnings: { total?: number } | null;
  earningsError: string | null;
  agentToken: {
    mint: string | null;
    pool: string | null;
    dbcConfig: string | null;
    info: {
      symbol: string;
      name: string;
      marketCap?: number;
      liquidity?: number;
      quoteAsset?: { mint: string; symbol: string };
    } | null;
  };
  demo: boolean;
}

export function EarningsPanel() {
  const auth = useAuth();
  const [data, setData] = useState<EarningsData | null>(null);

  useEffect(() => {
    if (!auth.signedIn) return;
    auth
      .apiFetch("/api/earnings")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [auth]);

  if (!auth.signedIn) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6">
          <Button onClick={auth.login}>Sign in to see your agent</Button>
        </CardContent>
      </Card>
    );
  }
  if (!data) return <Skeleton className="h-48 w-full rounded-xl" />;

  const { agentToken } = data;
  const info = agentToken.info;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Droplets className="size-4" style={{ color: "var(--accent)" }} />
            Agent token pool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {!agentToken.mint ? (
            <p className="text-muted-foreground">
              Not launched yet. The agent token launches on a Meteora DBC pool
              quoted in SPACEX; set{" "}
              <span className="num">AGENT_TOKEN_MINT</span> and{" "}
              <span className="num">METEORA_POOL_ADDRESS</span> once it is live.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {info ? `${info.name} (${info.symbol})` : "Agent token"}
                </span>
                {info?.quoteAsset && (
                  <span className="num text-xs text-muted-foreground">
                    quoted in {info.quoteAsset.symbol}
                  </span>
                )}
              </div>
              <div className="num grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {info?.marketCap != null && (
                  <span>Market cap {fmtUsd(info.marketCap)}</span>
                )}
                {info?.liquidity != null && (
                  <span>Liquidity {fmtUsd(info.liquidity)}</span>
                )}
              </div>
              <div className="num flex flex-col gap-1 text-xs">
                <a
                  href={`https://solscan.io/token/${agentToken.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 underline"
                >
                  Token mint <ExternalLink className="size-3" />
                </a>
                {agentToken.pool && (
                  <a
                    href={`https://solscan.io/account/${agentToken.pool}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 underline"
                  >
                    Meteora pool <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDollarSign className="size-4" /> Agent revenue
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Trading fees earned</span>
            <span className="num">
              {data.demo
                ? "$0.00"
                : data.earnings?.total != null
                  ? fmtUsd(data.earnings.total)
                  : "—"}
            </span>
          </div>
          {data.earningsError && (
            <p className="text-xs text-muted-foreground">
              Earnings lookup failed: {data.earningsError}
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Fees from the SPACEX-quoted pool pay the agent&apos;s running costs —
            AI credits, swap fees, hosting. Your savings are never touched.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
