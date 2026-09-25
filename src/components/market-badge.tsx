"use client";

import { useEffect, useState } from "react";
import { MoonStar, Sun } from "lucide-react";

interface MarketState {
  open: boolean;
  label: string;
}

// "Wall St closed — agent still trading" badge. Polls /api/market each minute.
export function MarketBadge() {
  const [m, setM] = useState<MarketState | null>(null);
  useEffect(() => {
    let stop = false;
    const tick = () =>
      fetch("/api/market")
        .then((r) => r.json())
        .then((d) => !stop && setM(d))
        .catch(() => {});
    tick();
    const t = setInterval(tick, 60_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, []);
  if (!m) return null;
  const Icon = m.open ? Sun : MoonStar;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        background: m.open
          ? "color-mix(in oklch, var(--discount) 12%, transparent)"
          : "color-mix(in oklch, var(--accent) 12%, transparent)",
        color: m.open ? "var(--discount)" : "var(--accent)",
      }}
    >
      <Icon className="size-3.5" />
      {m.label}
    </span>
  );
}
