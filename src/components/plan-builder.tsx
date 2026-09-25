"use client";

import { useEffect, useState } from "react";
import { CalendarClock, Pause, Play } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { VerdictChip } from "@/components/verdict-chip";
import { fmtPct, fmtUsd } from "@/lib/format";
import { toast } from "sonner";

interface Token {
  symbol: string;
  name: string;
  image: string;
  tokenPrice: number;
  markPrice: number;
  premiumPct: number;
  marketSize: number;
  verdict: "discount" | "fair" | "overpriced";
}
interface Plan {
  id: number;
  symbol: string;
  amount_usdc: number;
  frequency: string;
  max_premium_pct: number;
  next_run_at: string;
  active: boolean;
}

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export function PlanBuilder() {
  const auth = useAuth();
  const [tokens, setTokens] = useState<Token[] | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [symbol, setSymbol] = useState<string | null>(null);
  const [amount, setAmount] = useState("50");
  const [frequency, setFrequency] = useState("weekly");
  const [cap, setCap] = useState("10");
  const [saving, setSaving] = useState(false);

  const refreshPlans = () =>
    auth
      .apiFetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans ?? []))
      .catch(() => {});

  useEffect(() => {
    fetch("/api/prestocks")
      .then((r) => r.json())
      .then((d) => setTokens(d.tokens ?? []))
      .catch(() => setTokens([]));
  }, []);
  useEffect(() => {
    if (auth.signedIn) refreshPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.signedIn]);

  const save = async () => {
    if (!symbol) return;
    setSaving(true);
    try {
      const res = await auth.apiFetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          amountUsdc: Number(amount),
          frequency,
          maxPremiumPct: Number(cap),
        }),
      });
      const body = await res.json();
      if (res.ok) {
        toast.success(`Plan set: ${fmtUsd(Number(amount))} ${frequency} → ${symbol}`);
        refreshPlans();
      } else {
        toast.error(body.error ?? "Could not create the plan");
      }
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (plan: Plan) => {
    await auth.apiFetch(`/api/plans/${plan.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !plan.active }),
    });
    refreshPlans();
  };

  const picked = tokens?.find((t) => t.symbol === symbol);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pick a token</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!tokens ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <ul className="max-h-72 divide-y divide-border overflow-y-auto">
              {tokens.map((t) => (
                <li key={t.symbol}>
                  <button
                    onClick={() => setSymbol(t.symbol)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/60 ${
                      symbol === t.symbol ? "bg-muted/60" : ""
                    }`}
                  >
                    {t.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.image}
                        alt=""
                        className="size-7 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <span className="size-7 rounded-full border border-border bg-muted" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{t.name}</div>
                      <div className="num text-xs text-muted-foreground">
                        {fmtUsd(t.tokenPrice)} · {fmtUsd(t.marketSize)}
                      </div>
                    </div>
                    <VerdictChip verdict={t.verdict} className="max-sm:hidden" />
                    <span className="num w-16 text-right text-xs">
                      {fmtPct(t.premiumPct)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4" /> The plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Amount (USDC)
              </label>
              <Input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="num"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">
                Every
              </label>
              <div className="flex rounded-lg border border-border">
                {FREQUENCY_OPTIONS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setFrequency(f.value)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-sm ${
                      frequency === f.value
                        ? "bg-muted font-medium"
                        : "text-muted-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Premium guard — skip the buy if the token trades more than this
              far above fair value
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={50}
                step={1}
                value={cap}
                onChange={(e) => setCap(e.target.value)}
                className="flex-1 accent-[var(--accent)]"
              />
              <span className="num w-14 text-right text-sm">+{cap}%</span>
            </div>
          </div>
          <Button
            onClick={save}
            disabled={!symbol || !auth.signedIn || saving}
            className="w-full"
          >
            {picked
              ? `Buy ${fmtUsd(Number(amount) || 0)} of ${picked.symbol} ${frequency}`
              : "Pick a token first"}
          </Button>
          {!auth.signedIn && (
            <p className="text-center text-xs text-muted-foreground">
              <button onClick={auth.login} className="underline">
                Sign in
              </button>{" "}
              to create a plan.
            </p>
          )}
        </CardContent>
      </Card>

      {plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your plans</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {plans.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between px-4 py-2.5 text-sm"
                >
                  <div>
                    <span className="font-medium">
                      {fmtUsd(p.amount_usdc)} {p.frequency} → {p.symbol}
                    </span>
                    <div className="num text-xs text-muted-foreground">
                      cap +{p.max_premium_pct}% ·{" "}
                      {p.active
                        ? `next ${new Date(p.next_run_at).toLocaleString()}`
                        : "paused"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => toggle(p)}
                  >
                    {p.active ? (
                      <Pause className="size-4" />
                    ) : (
                      <Play className="size-4" />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
