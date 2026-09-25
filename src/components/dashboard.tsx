"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bot, Wallet, ArrowRight, CircleDollarSign, ListChecks } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtUsd } from "@/lib/format";

interface BrokerUser {
  agent_id: string | null;
  agent_wallet: string | null;
  external_wallet: string | null;
  demo: boolean;
}
interface AgentData {
  user: BrokerUser;
  wallets: { usdc_balance?: number; sol_balance?: number }[];
  walletError: string | null;
  demo: boolean;
}
interface Plan {
  id: number;
  symbol: string;
  amount_usdc: number;
  frequency: string;
  next_run_at: string;
  active: boolean;
}
interface Activity {
  id: number;
  kind: string;
  symbol: string | null;
  amount_usdc: number | null;
  token_amount: number | null;
  reason: string;
  demo: boolean;
  created_at: string;
}

export function Dashboard() {
  const auth = useAuth();
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.signedIn) return;
    let stop = false;
    Promise.all([
      auth.apiFetch("/api/agent", { method: "POST", body: "{}" }).then((r) => r.json()),
      auth.apiFetch("/api/plans").then((r) => r.json()),
      auth.apiFetch("/api/activity").then((r) => r.json()),
    ])
      .then(([a, p, act]) => {
        if (stop) return;
        setAgent(a);
        setPlans(p.plans ?? []);
        setActivity((act.activity ?? []).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => !stop && setLoading(false));
    return () => {
      stop = true;
    };
  }, [auth]);

  if (!auth.signedIn) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-start gap-3 py-6">
          <p className="text-sm text-muted-foreground">
            Sign in and your agent gets its own Solana wallet in seconds.
          </p>
          <Button onClick={auth.login}>Sign in</Button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  const usdc = agent?.wallets?.[0]?.usdc_balance;
  const sol = agent?.wallets?.[0]?.sol_balance;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="size-4" style={{ color: "var(--accent)" }} />
            Your agent
            {agent?.demo && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                demo
              </span>
            )}
          </CardTitle>
          <Button variant="outline" size="sm">
            <Link href="/fund">Fund my agent</Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Wallet className="size-3.5" /> Wallet
            </span>
            <span className="num truncate pl-4 text-xs">
              {agent?.user.agent_wallet ?? "—"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Balance</span>
            <span className="num">
              {agent?.demo
                ? "$0.00"
                : `${fmtUsd(usdc ?? 0)} USDC · ${sol?.toFixed(4) ?? "0"} SOL`}
            </span>
          </div>
          {agent?.walletError && (
            <p className="text-xs text-muted-foreground">
              Balance lookup failed: {agent.walletError}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="size-4" /> Plans
          </CardTitle>
          <Button variant="outline" size="sm">
            <Link href="/plan">New plan</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No plan yet — pick a token, an amount and a frequency.{" "}
              <Link href="/plan" className="underline">
                Set up your first buy
              </Link>
              .
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {plans.slice(0, 3).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span>
                    {fmtUsd(p.amount_usdc)} {p.frequency} → {p.symbol}
                  </span>
                  <span className="num text-xs text-muted-foreground">
                    {p.active
                      ? `next ${new Date(p.next_run_at).toLocaleString()}`
                      : "paused"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDollarSign className="size-4" /> Recent activity
          </CardTitle>
          <Link
            href="/activity"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            All <ArrowRight className="size-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet. Buys show up here with the price and a one-line
              reason.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {activity.map((a) => (
                <li key={a.id} className="py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {a.kind === "buy"
                        ? `Bought ${a.symbol}`
                        : a.kind === "skip"
                          ? `Skipped ${a.symbol}`
                          : a.kind === "fund"
                            ? "Funded agent"
                            : a.kind === "withdraw"
                              ? "Withdrew"
                              : "Agent created"}
                      {a.demo && (
                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          demo
                        </span>
                      )}
                    </span>
                    {a.amount_usdc != null && (
                      <span className="num">{fmtUsd(a.amount_usdc)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{a.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
