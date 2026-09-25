import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { fetchPreStocks } from "@/lib/prestocks";
import { fmtPct, fmtUsd } from "@/lib/format";
import { SiteHeader } from "@/components/site-header";
import { VerdictChip } from "@/components/verdict-chip";
import { StaleBanner } from "@/components/stale-banner";
import { UpdatedAgo } from "@/components/updated-ago";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const revalidate = 300;

export default async function DiscountPage() {
  const { tokens, updatedAt, source } = await fetchPreStocks();
  const discounted = tokens
    .filter((t) => t.verdict === "discount")
    .sort((a, b) => a.premiumPct - b.premiumPct);
  const closest = [...tokens].sort((a, b) => a.premiumPct - b.premiumPct)[0];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <h1 className="mb-2 text-xl font-bold">Discount watch</h1>
        <p className="mb-6 max-w-xl text-sm text-muted-foreground">
          A discount means the token costs less than the company&apos;s latest
          valuation implies. Possible reasons: sellers wanting liquidity, thin
          demand, or a mark price that hasn&apos;t caught up with the market. It
          is not a guarantee of anything.
        </p>
        {source === "snapshot" && (
          <div className="mb-4">
            <StaleBanner />
          </div>
        )}
        {discounted.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No tokens are at a discount right now. The closest is{" "}
              <Link
                href={`/token/${closest.symbol}`}
                className="text-foreground underline"
              >
                {closest.symbol}
              </Link>{" "}
              at <span className="num">{fmtPct(closest.premiumPct)}</span>.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {discounted.map((t) => (
              <li key={t.symbol}>
                <Card>
                  <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {t.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.image}
                          alt=""
                          className="size-10 shrink-0 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <span className="size-10 shrink-0 rounded-full border border-border bg-muted" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium">{t.name}</div>
                        <div className="mt-1">
                          <VerdictChip verdict={t.verdict} />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 text-sm text-muted-foreground">
                      Trades{" "}
                      <span className="num text-foreground">
                        {fmtUsd(Math.abs(t.tokenPrice - t.markPrice))} (
                        {fmtPct(t.premiumPct)})
                      </span>{" "}
                      below the company&apos;s last mark price of{" "}
                      <span className="num text-foreground">
                        {fmtUsd(t.markPrice)}
                      </span>
                      . Market size{" "}
                      <span className="num">{fmtUsd(t.marketSize)}</span>.
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        nativeButton={false}
                        render={<Link href={`/token/${t.symbol}`} />}
                      >
                        Open X-Ray
                      </Button>
                      {t.external_url && (
                        <Button
                          size="sm"
                          nativeButton={false}
                          render={
                            <a
                              href={t.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            />
                          }
                        >
                          Buy on PreStocks <ExternalLink />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </main>
      <footer className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pb-6 text-xs text-muted-foreground">
        <span>
          PreStocks · <UpdatedAgo iso={updatedAt} />
        </span>
        <span>Data, not financial advice.</span>
      </footer>
    </>
  );
}
