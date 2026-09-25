"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtUsd, fmtTokens, relativeTime } from "@/lib/format";

interface Activity {
  id: number;
  kind: "create" | "fund" | "buy" | "skip" | "withdraw";
  symbol: string | null;
  amount_usdc: number | null;
  token_amount: number | null;
  price: number | null;
  reason: string;
  tx: string | null;
  demo: boolean;
  created_at: string;
}

const KIND_LABEL: Record<Activity["kind"], string> = {
  create: "Agent created",
  fund: "Funded agent",
  buy: "Bought",
  skip: "Skipped",
  withdraw: "Withdrew",
};

export function ActivityFeed() {
  const auth = useAuth();
  const [items, setItems] = useState<Activity[] | null>(null);

  useEffect(() => {
    if (!auth.signedIn) return;
    auth
      .apiFetch("/api/activity")
      .then((r) => r.json())
      .then((d) => setItems(d.activity ?? []))
      .catch(() => setItems([]));
  }, [auth]);

  if (!auth.signedIn) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6">
          <Button onClick={auth.login}>Sign in to see activity</Button>
        </CardContent>
      </Card>
    );
  }
  if (!items) return <Skeleton className="h-64 w-full rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="px-4 pb-6 text-sm text-muted-foreground">
            Nothing yet — each buy lands here with the price, the amount, and a
            one-line reason.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((a) => (
              <li key={a.id} className="px-4 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    {KIND_LABEL[a.kind]}
                    {a.symbol ? ` ${a.symbol}` : ""}
                    {a.demo && (
                      <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        demo
                      </span>
                    )}
                  </span>
                  <span className="num text-xs text-muted-foreground">
                    {relativeTime(a.created_at)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{a.reason}</p>
                <div className="num mt-1 flex items-center gap-3 text-xs">
                  {a.amount_usdc != null && <span>{fmtUsd(a.amount_usdc)}</span>}
                  {a.token_amount != null && a.price != null && (
                    <span className="text-muted-foreground">
                      {fmtTokens(a.token_amount)} @ {fmtUsd(a.price)}
                    </span>
                  )}
                  {a.tx && (
                    <a
                      href={`https://solscan.io/tx/${a.tx}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-0.5 underline"
                    >
                      tx <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
