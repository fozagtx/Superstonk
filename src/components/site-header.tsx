import Link from "next/link";
import { Bot } from "lucide-react";
import { MarketBadge } from "@/components/market-badge";

const NAV = [
  ["Dashboard", "/"],
  ["Fund", "/fund"],
  ["Plan", "/plan"],
  ["Activity", "/activity"],
  ["Agent", "/agent"],
] as const;

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-2 px-4 py-4">
      <Link href="/" className="flex items-center gap-2 font-bold">
        <Bot className="size-5" style={{ color: "var(--accent)" }} />
        After-Hours Broker
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
