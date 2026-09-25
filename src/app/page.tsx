import Link from "next/link";
import { fetchPreStocks } from "@/lib/prestocks";
import { fmtPct, fmtUsd } from "@/lib/format";
import { SiteHeader } from "@/components/site-header";
import { VerdictChip } from "@/components/verdict-chip";
import { UpdatedAgo } from "@/components/updated-ago";
import { StaleBanner } from "@/components/stale-banner";

export const revalidate = 300;

export default async function LeaderboardPage() {
  const { tokens, updatedAt, source } = await fetchPreStocks();
  const sorted = [...tokens].sort((a, b) => b.premiumPct - a.premiumPct);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <p className="mb-6 text-sm text-muted-foreground">
          Fair value = the company&apos;s latest valuation. Premium = how much
          more the token costs.
        </p>
        {source === "snapshot" && (
          <div className="mb-4">
            <StaleBanner />
          </div>
        )}
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {sorted.map((t) => (
            <li key={t.symbol}>
              <Link
                href={`/token/${t.symbol}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/60"
              >
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={t.image}
                    alt=""
                    className="size-9 shrink-0 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="size-9 shrink-0 rounded-full border border-border bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{t.name}</div>
                  <div className="num text-xs text-muted-foreground">
                    {t.symbol} · {fmtUsd(t.marketSize)}
                  </div>
                </div>
                <VerdictChip
                  verdict={t.verdict}
                  className="shrink-0 max-sm:px-2 max-sm:text-[11px]"
                />
                <div
                  className="num w-[4.5rem] shrink-0 text-right text-sm font-medium"
                  style={{
                    color:
                      t.premiumPct > 5
                        ? "var(--overpriced)"
                        : t.premiumPct < -5
                          ? "var(--discount)"
                          : "var(--text)",
                  }}
                >
                  {fmtPct(t.premiumPct)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
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
