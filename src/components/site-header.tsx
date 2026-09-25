import Link from "next/link";
import { LineChart } from "lucide-react";
import { MarketBadge } from "@/components/market-badge";

const NAV = [
  ["Research", "/"],
  ["Agents API", "/agents"],
] as const;

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5">
      <Link
        href="/"
        className="flex items-center gap-2 font-bold tracking-tight"
      >
        <LineChart className="size-5" style={{ color: "var(--accent)" }} />
        <span>Superstonk</span>
        <span className="text-xs font-normal text-muted-foreground">
          pre-IPO research
        </span>
      </Link>
      <div className="flex items-center gap-3">
        <nav className="flex items-center gap-3">
          {NAV.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {label}
            </Link>
          ))}
        </nav>
        <MarketBadge />
      </div>
    </header>
  );
}
