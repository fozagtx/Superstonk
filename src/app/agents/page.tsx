import Link from "next/link";
import { ArrowRight, Bot, FileCode2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { CopyButton } from "@/components/copy-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const endpoints = [
  ["GET", "/api/v1/research", "Full report with all token research, runners, source, and market status."],
  ["GET", "/api/v1/runners?window=7d", "Ranked daily, weekly, or monthly runners. Change the window to 1d or 30d."],
  ["GET", "/api/v1/tokens", "Lightweight token list without OHLCV candles for polling."],
  ["GET", "/api/v1/tokens/SPACEX", "One token with full DEX stats, candles, signals, and summary."],
  ["GET", "/api/v1/tokens/SPACEX/launch-kit", "Suggested metadata, quote mints, Meteora DBC notes, and links."],
];

export default function AgentsPage() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
        <div className="mb-8 max-w-2xl"><div className="mb-3 flex items-center gap-2 text-accent"><Bot className="size-5" /><span className="text-sm font-medium">Agent API v1</span></div><h1 className="mb-2 text-3xl font-bold tracking-tight">Built for agents</h1><p className="text-sm leading-6 text-muted-foreground">Pull live PreStocks research, identify runners, and get a launch-ready suggestion kit without wallets, auth, or client-side Clawpump calls.</p></div>
        <section className="mb-8 grid gap-3 md:grid-cols-2">
          {endpoints.map(([method, path, description]) => <Card key={path} size="sm"><CardHeader><CardTitle className="flex items-center gap-2 text-sm"><span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">{method}</span><code className="text-xs">{path}</code></CardTitle></CardHeader><CardContent className="space-y-3"><p className="text-sm text-muted-foreground">{description}</p><div className="flex items-center justify-between gap-2 rounded-md bg-muted px-2 py-1.5"><code className="truncate text-[11px]">curl {base}{path}</code><CopyButton value={`curl ${base}${path}`} /></div></CardContent></Card>)}
        </section>
        <div className="mb-8 flex flex-wrap gap-2"><Link href="/api/v1/skill.md" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><FileCode2 className="size-4" /> skill.md</Link><Link href="/api/v1/openapi.json" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><FileCode2 className="size-4" /> openapi.json</Link><Link href="/llms.txt" className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-sm hover:bg-muted"><FileCode2 className="size-4" /> llms.txt</Link></div>
        <Card><CardHeader><CardTitle>Runner → launch kit → Meteora DBC</CardTitle></CardHeader><CardContent><div className="grid gap-4 md:grid-cols-3">{[["01", "Find a runner", "Call runners with a window, then inspect the token’s signals, liquidity, and DEX-versus-quote divergence."], ["02", "Get the kit", "Request launch-kit for suggested metadata, underlying mint links, and quote mint options."], ["03", "Review and simulate", "Use the Meteora DBC SDK to build, simulate, and verify the curve before any wallet signs."]].map(([number, title, text]) => <div key={number} className="flex gap-3"><span className="num text-accent">{number}</span><div><h3 className="font-medium">{title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p></div></div>)}</div><Link href="/" className="mt-6 inline-flex items-center gap-1 text-sm text-accent hover:underline">Browse research <ArrowRight className="size-4" /></Link></CardContent></Card>
      </main>
    </>
  );
}
