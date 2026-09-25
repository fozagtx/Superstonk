"use client";

import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Line, LineChart, Tooltip, XAxis, YAxis } from "recharts";
import type { Candle } from "@/lib/dex";

const config: ChartConfig = {
  close: { label: "Close", color: "var(--accent)" },
};

export function PriceChart({ candles }: { candles: Candle[] }) {
  if (candles.length < 2) {
    return (
      <div className="flex h-56 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
        History warming up — chart appears after DEX candles arrive.
      </div>
    );
  }
  const data = candles.map((candle) => ({
    date: new Date(candle.t * 1000).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    close: candle.c,
  }));
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <LineChart
        data={data}
        margin={{ top: 10, right: 12, bottom: 0, left: 0 }}
      >
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis hide domain={["auto", "auto"]} />
        <Tooltip
          contentStyle={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 8,
          }}
          formatter={(value) => [`$${Number(value).toFixed(2)}`, "Close"]}
        />
        <Line
          type="monotone"
          dataKey="close"
          stroke="var(--color-close)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ChartContainer>
  );
}
