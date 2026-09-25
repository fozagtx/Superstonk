import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  Check,
  ExternalLink,
  TriangleAlert,
  X,
} from "lucide-react";
import { fetchPreStocks } from "@/lib/prestocks";
import { fmtPct, fmtUsd } from "@/lib/format";
import { getTransferFeeBps } from "@/lib/solana";
import { isConfigured as isTelegramConfigured } from "@/lib/telegram";
import { SiteHeader } from "@/components/site-header";
import { VerdictChip } from "@/components/verdict-chip";
import { PremiumGauge } from "@/components/premium-gauge";
import { PremiumChart } from "@/components/premium-chart";
import { SupplyBadge } from "@/components/supply-badge";
import { AlertDialog } from "@/components/alert-dialog";
import { ShareTokenDialog } from "@/components/share-token-dialog";
import { AnimPct } from "@/components/anim-num";
import { StaleBanner } from "@/components/stale-banner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ symbol: string }>;
}): Promise<Metadata> {
  const { symbol } = await params;
  const { tokens } = await fetchPreStocks();
  const token = tokens.find(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase(),
  );
  if (!token) return { title: "Pre-IPO X-Ray" };
  const pct = fmtPct(token.premiumPct);
  const dir = token.premiumPct >= 0 ? "above" : "below";
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const og = `${base}/api/og/token/${token.symbol}`;
  return {
    title: `${token.symbol} · ${pct} ${dir} fair value · Pre-IPO X-Ray`,
    description: `${token.name} trades ${pct} ${dir} its mark price on PreStocks.`,
    openGraph: { images: [og] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function TokenPage({
  params,
}: {
  params: Promise<{ symbol: string }>;
}) {
  const { symbol } = await params;
  const { tokens, source } = await fetchPreStocks();
  const token = tokens.find(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase(),
  );
  if (!token) notFound();

  const onePctSale = token.marketSize * 0.01;
  const feeBps = token.contract_address
    ? await getTransferFeeBps(token.contract_address)
    : null;
  const feePct = ((feeBps ?? 300) / 100).toFixed(
    (feeBps ?? 300) % 100 === 0 ? 0 : 1,
  );

  const ownership: {
    icon: "yes" | "no" | "warn";
    text: string;
  }[] = [
    { icon: "yes", text: "Price exposure to the company (SPV-backed 1:1)" },
    { icon: "no", text: "Voting rights" },
    { icon: "no", text: "Dividends" },
    { icon: "no", text: "Company information rights" },
    { icon: "warn", text: "Redemption for large holders only" },
    {
      icon: "warn",
      text: `${feePct}% fee on every transfer (Token-2022 transfer fee, read on-chain)`,
    },
    {
      icon: "warn",
      text: "Issuer holds a permanent delegate on the mint",
    },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-muted-foreground hover:text-foreground"
        >
          ← All tokens
        </Link>
        {source === "snapshot" && (
          <div className="mb-4">
            <StaleBanner />
          </div>
        )}

        <div className="mb-6 flex items-center gap-3">
          {token.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={token.image}
              alt=""
              className="size-11 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="size-11 rounded-full border border-border bg-muted" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{token.name}</h1>
            <div className="num text-sm text-muted-foreground">
              {token.symbol}
            </div>
          </div>
          <VerdictChip verdict={token.verdict} />
        </div>

        {token.contract_address && (
          <div className="mb-6">
            <Suspense fallback={<Skeleton className="h-5 w-44" />}>
              <SupplyBadge
                mint={token.contract_address}
                apiSupply={token.supply}
              />
            </Suspense>
          </div>
        )}

        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="num mb-4 text-5xl font-medium tracking-tight">
              <AnimPct value={token.premiumPct} />
            </div>
            <PremiumGauge premiumPct={token.premiumPct} />
          </CardContent>
        </Card>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Token price
              </CardTitle>
            </CardHeader>
            <CardContent className="num text-xl">
              {fmtUsd(token.tokenPrice)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Mark price (fair value)
              </CardTitle>
            </CardHeader>
            <CardContent className="num text-xl">
              {fmtUsd(token.markPrice)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Company valuation
              </CardTitle>
            </CardHeader>
            <CardContent className="num text-xl">
              {token.markValuation ? fmtUsd(token.markValuation) : "—"}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Implied valuation
              </CardTitle>
            </CardHeader>
            <CardContent className="num text-xl">
              {token.impliedValuation ? fmtUsd(token.impliedValuation) : "—"}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-4">
          <CardContent className="pt-6 text-sm text-muted-foreground">
            This entire market is{" "}
            <span className="num font-medium text-foreground">
              {fmtUsd(token.marketSize)}
            </span>
            . A{" "}
            <span className="num font-medium text-foreground">
              {fmtUsd(onePctSale)}
            </span>{" "}
            sale would move the price.
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">What you own</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2.5">
              {ownership.map((item) => (
                <li key={item.text} className="flex items-start gap-2.5 text-sm">
                  {item.icon === "yes" && (
                    <Check
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: "var(--discount)" }}
                    />
                  )}
                  {item.icon === "no" && (
                    <X
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: "var(--overpriced)" }}
                    />
                  )}
                  {item.icon === "warn" && (
                    <TriangleAlert
                      className="mt-0.5 size-4 shrink-0"
                      style={{ color: "var(--warning)" }}
                    />
                  )}
                  <span className="text-secondary-foreground">{item.text}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Premium history</CardTitle>
          </CardHeader>
          <CardContent>
            <PremiumChart
              symbol={token.symbol}
              currentPct={token.premiumPct}
              verdict={token.verdict}
            />
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <AlertDialog
            symbol={token.symbol}
            premiumPct={token.premiumPct}
            configured={isTelegramConfigured()}
          />
          <ShareTokenDialog
            symbol={token.symbol}
            premiumPct={token.premiumPct}
          />
          {token.external_url && (
            <Button
              nativeButton={false}
              render={
                <a
                  href={token.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              Buy on PreStocks <ExternalLink />
            </Button>
          )}
        </div>
        <Separator className="my-6" />
        <p className="text-xs text-muted-foreground">
          Data, not financial advice.
        </p>
      </main>
    </>
  );
}
