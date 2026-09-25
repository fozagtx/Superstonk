"use client";

import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VerdictChip } from "@/components/verdict-chip";
import { fmtPct, fmtUsd } from "@/lib/format";
import type { Runner } from "@/lib/research";
import type { Window } from "@/lib/analysis";

export function RunnerBoard({ runners }: { runners: Record<Window, Runner[]> }) {
  return (
    <section className="mb-8">
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-semibold">Runner board</h2>
          <p className="text-sm text-muted-foreground">Top PreStocks moves by daily, weekly, and monthly window.</p>
        </div>
      </div>
      <Tabs defaultValue="1d">
        <TabsList className="mb-3 w-full max-w-sm">
          <TabsTrigger value="1d">Daily</TabsTrigger>
          <TabsTrigger value="7d">Weekly</TabsTrigger>
          <TabsTrigger value="30d">Monthly</TabsTrigger>
        </TabsList>
        {(["1d", "7d", "30d"] as Window[]).map((window) => (
          <TabsContent key={window} value={window}>
            <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              {runners[window].length === 0 ? (
                <p className="p-5 text-sm text-muted-foreground">History warming up — runners appear as DEX candles arrive.</p>
              ) : (
                <div className="divide-y divide-border">
                  {runners[window].slice(0, 8).map((runner, index) => (
                    <Link key={runner.symbol} href={`/token/${runner.symbol}`} className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 sm:grid-cols-[2rem_2fr_1fr_1fr_1fr_auto]">
                      <span className="num text-sm text-muted-foreground">{index + 1}</span>
                      <span className="flex min-w-0 items-center gap-2">
                        {runner.image ? <img src={runner.image} alt="" className="size-7 rounded-full object-cover" /> : <span className="size-7 rounded-full bg-muted" />}
                        <span className="min-w-0"><span className="block truncate font-medium">{runner.name}</span><span className="num text-xs text-muted-foreground">{runner.symbol}</span></span>
                      </span>
                      <span className={`num text-right font-medium ${runner.changePct >= 0 ? "text-discount" : "text-overpriced"}`}>{fmtPct(runner.changePct)}</span>
                      <span className="hidden text-right text-xs text-muted-foreground sm:block">{runner.volume24hUsd == null ? "—" : fmtUsd(runner.volume24hUsd)}</span>
                      <span className="hidden justify-self-end sm:block"><VerdictChip verdict={runner.verdict} /></span>
                      <span className="num rounded-md bg-muted px-2 py-1 text-xs">{runner.score}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
