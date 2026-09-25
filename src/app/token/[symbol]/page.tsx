import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerdictChip } from "@/components/verdict-chip";
import { SiteHeader } from "@/components/site-header";
import { PriceChart } from "@/components/price-chart";
import { LaunchKitPreview } from "@/components/launch-kit-preview";
import { buildLaunchKit } from "@/lib/launch-kit";
import { buildResearch } from "@/lib/research";
import { fmtPct, fmtUsd } from "@/lib/format";

export const dynamic = "force-dynamic";
export const dynamicParams = false;

export function generateStaticParams() {
  return ["ANDURIL", "ANTHROPIC", "FIGUREAI", "KALSHI", "NEURALINK", "OPENAI", "POLYMARKET", "SPACEX"].map((symbol) => ({ symbol }));
}

export default async function TokenPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const report = await buildResearch();
  const token = report.tokens.find((item) => item.symbol.toLowerCase() === symbol.toLowerCase());
  if (!token) notFound();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const kit = buildLaunchKit(token, appUrl);
  const stats = [
    ["PreStocks quote", fmtUsd(token.quotePrice)],
    ["Mark price", fmtUsd(token.markPrice)],
    ["Premium", fmtPct(token.premiumPct)],
    ["DEX price", token.dex?.priceUsd == null ? "—" : fmtUsd(token.dex.priceUsd)],
    ["DEX divergence", token.dexDivergencePct == null ? "—" : fmtPct(token.dexDivergencePct)],
    ["DEX liquidity", token.dex?.liquidityUsd == null ? "—" : fmtUsd(token.dex.liquidityUsd)],
    ["DEX 24h volume", token.dex?.volume24hUsd == null ? "—" : fmtUsd(token.dex.volume24hUsd)],
    ["24h buys / sells", token.dex?.topPool ? `${token.dex.topPool.buys24h} / ${token.dex.topPool.sells24h}` : "—"],
  ];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
        <Link href="/" className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Research</Link>
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">{token.image ? <img src={token.image} alt="" className="size-14 rounded-full object-cover ring-1 ring-border" /> : <span className="size-14 rounded-full bg-muted" />}<div><h1 className="text-2xl font-bold">{token.name}</h1><p className="num text-sm text-muted-foreground">{token.symbol}</p></div></div>
          <div className="flex items-center gap-3"><VerdictChip verdict={token.verdict} /><span className="num rounded-lg bg-accent/15 px-3 py-2 text-lg font-bold text-accent">{token.score}<span className="ml-1 text-xs font-normal">score</span></span></div>
        </header>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{stats.map(([label, value]) => <Card key={label} size="sm"><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="num mt-1 text-sm font-semibold">{value}</p></CardContent></Card>)}</div>
        <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <Card><CardHeader><CardTitle>30-day DEX close <span className="text-xs font-normal text-muted-foreground">(GeckoTerminal)</span></CardTitle></CardHeader><CardContent><PriceChart candles={token.dex?.candles ?? []} /></CardContent></Card>
            <Card><CardHeader><CardTitle>Signals</CardTitle></CardHeader><CardContent><ul className="space-y-3">{token.signals.map((signal, index) => <li key={`${signal.kind}-${index}`} className="flex gap-2 text-sm"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${signal.tone === "bullish" ? "bg-discount" : signal.tone === "bearish" ? "bg-overpriced" : signal.tone === "caution" ? "bg-warning" : "bg-fair"}`} /><span>{signal.text}</span></li>)}</ul></CardContent></Card>
          </div>
          <div className="space-y-6">
            <Card><CardHeader><CardTitle>Research summary</CardTitle></CardHeader><CardContent><p className="text-sm leading-6 text-muted-foreground">{token.summary}</p>{token.externalUrl && <a href={token.externalUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm text-accent hover:underline">PreStocks source <ExternalLink className="size-3" /></a>}</CardContent></Card>
            <Card><CardHeader><CardTitle>Launch kit</CardTitle><p className="text-sm text-muted-foreground">Suggestions for an agent planning a Meteora DBC launch — review and simulate before signing.</p></CardHeader><CardContent className="space-y-3"><LaunchKitPreview kit={kit} /><code className="block overflow-x-auto rounded-lg bg-muted p-3 text-xs">curl {appUrl}/api/v1/tokens/{token.symbol}/launch-kit</code></CardContent></Card>
          </div>
        </div>
      </main>
    </>
  );
}
