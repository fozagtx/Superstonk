import Link from "next/link";
import { VerdictChip } from "@/components/verdict-chip";
import { fmtPct, fmtUsd } from "@/lib/format";
import type { TokenResearch } from "@/lib/research";

export function ResearchTable({ tokens }: { tokens: TokenResearch[] }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-lg font-semibold">Research table</h2>
        <p className="text-sm text-muted-foreground">
          Canonical PreStocks quotes with DEX context and deterministic signals.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl bg-card ring-1 ring-foreground/10">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              {[
                "Token",
                "Quote",
                "Mark",
                "Premium",
                "1d",
                "7d",
                "30d",
                "Liquidity",
                "Score",
                "Top signal",
              ].map((heading) => (
                <th key={heading} className="px-3 py-3 font-medium">
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tokens.map((token) => {
              const signal = token.signals[0]?.text ?? "History warming up";
              return (
                <tr key={token.symbol} className="hover:bg-muted/40">
                  <td className="px-3 py-3">
                    <Link
                      href={`/token/${token.symbol}`}
                      className="font-medium hover:text-accent"
                    >
                      {token.symbol}
                    </Link>
                    <span className="block max-w-[130px] truncate text-xs text-muted-foreground">
                      {token.name}
                    </span>
                  </td>
                  <td className="num px-3 py-3">{fmtUsd(token.quotePrice)}</td>
                  <td className="num px-3 py-3 text-muted-foreground">
                    {fmtUsd(token.markPrice)}
                  </td>
                  <td className="px-3 py-3">
                    <div className="num">{fmtPct(token.premiumPct)}</div>
                    <VerdictChip verdict={token.verdict} />
                  </td>
                  {(["1d", "7d", "30d"] as const).map((window) => (
                    <td
                      key={window}
                      className={`num px-3 py-3 ${token.change[window] == null ? "text-muted-foreground" : token.change[window]! >= 0 ? "text-discount" : "text-overpriced"}`}
                    >
                      {token.change[window] == null
                        ? "—"
                        : fmtPct(token.change[window]!)}
                    </td>
                  ))}
                  <td className="num px-3 py-3">
                    {token.dex?.liquidityUsd == null
                      ? "—"
                      : fmtUsd(token.dex.liquidityUsd)}
                  </td>
                  <td className="num px-3 py-3 font-semibold">{token.score}</td>
                  <td className="max-w-[260px] px-3 py-3 text-xs text-muted-foreground">
                    {signal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
