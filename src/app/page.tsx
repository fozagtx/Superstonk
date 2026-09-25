import { SiteHeader } from "@/components/site-header";
import { RunnerBoard } from "@/components/runner-board";
import { ResearchTable } from "@/components/research-table";
import { buildResearch } from "@/lib/research";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const report = await buildResearch();
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-full bg-accent/40 px-2.5 py-1 text-xs font-medium text-accent-foreground">
              {report.market.label}
            </span>
            <span className="text-xs text-muted-foreground">
              Updated {new Date(report.updatedAt).toLocaleTimeString()}
            </span>
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Pre-IPO runners, researched for humans and agents.
          </h1>
          <p className="text-sm leading-6 text-muted-foreground">
            Daily, weekly and monthly runners across PreStocks pre-IPO tokens —
            actionable data for your next trade, and for agents that launch tokens.
          </p>
        </div>
        <RunnerBoard runners={report.runners} />
        <ResearchTable tokens={report.tokens} />
      </main>
      <footer className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 pb-6 text-xs text-muted-foreground">
        <span>Data: PreStocks quotes + Solana DEX (GeckoTerminal).</span>
        <span>Not financial advice.</span>
      </footer>
    </>
  );
}
