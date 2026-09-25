"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceDot,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtPct } from "@/lib/format";
import type { Verdict } from "@/lib/metrics";

interface Point {
  t: string;
  premiumPct: number;
  tokenPrice: number;
  markPrice: number;
}

const verdictColor: Record<Verdict, string> = {
  overpriced: "var(--overpriced)",
  fair: "var(--fair)",
  discount: "var(--discount)",
};

const chartConfig = {
  premiumPct: { label: "Premium" },
} satisfies ChartConfig;

function fmtAxis(iso: string, range: string): string {
  const d = new Date(iso);
  if (range === "24h") {
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PremiumChart({
  symbol,
  currentPct,
  verdict,
}: {
  symbol: string;
  currentPct: number;
  verdict: Verdict;
}) {
  const [range, setRange] = useState("7d");
  const [result, setResult] = useState<{ range: string; points: Point[] }>({
    range: "",
    points: [],
  });
  const loading = result.range !== range;
  const points = loading ? [] : result.points;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/history/${symbol}?range=${range}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Point[]) => {
        if (!cancelled) {
          setResult({ range, points: Array.isArray(data) ? data : [] });
        }
      })
      .catch(() => {
        if (!cancelled) setResult({ range, points: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [symbol, range]);

  const stroke = verdictColor[verdict];
  const now = new Date().toISOString();
  const data = [...points];
  if (data.length === 0 || data[data.length - 1].t !== now) {
    // always show the live point at the end
    data.push({
      t: now,
      premiumPct: currentPct,
      tokenPrice: 0,
      markPrice: 0,
    });
  }

  return (
    <div>
      <Tabs value={range} onValueChange={setRange}>
        <TabsList className="mb-4">
          <TabsTrigger value="24h">24h</TabsTrigger>
          <TabsTrigger value="7d">7d</TabsTrigger>
          <TabsTrigger value="30d">30d</TabsTrigger>
        </TabsList>
      </Tabs>
      {points.length < 2 && !loading && (
        <p className="mb-3 text-sm text-muted-foreground">
          History starts today — the dot is where we are now.
        </p>
      )}
      <ChartContainer config={chartConfig} className="h-56 w-full">
        <AreaChart data={data} margin={{ left: 4, right: 4, top: 8 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="t"
            tickFormatter={(v) => fmtAxis(v, range)}
            tickLine={false}
            axisLine={false}
            minTickGap={40}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            className="num"
          />
          <YAxis
            tickFormatter={(v) => fmtPct(v)}
            tickLine={false}
            axisLine={false}
            width={56}
            tick={{ fill: "var(--text-muted)", fontSize: 11 }}
            domain={["auto", "auto"]}
          />
          <ReferenceArea
            y1={-5}
            y2={5}
            fill="var(--surface-raised)"
            fillOpacity={0.6}
          />
          <ReferenceLine
            y={-5}
            stroke="var(--text-muted)"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <ReferenceLine
            y={5}
            stroke="var(--text-muted)"
            strokeDasharray="3 3"
            strokeOpacity={0.5}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                labelFormatter={(v) => new Date(v).toLocaleString("en-US")}
                formatter={(value) => (
                  <span className="num">{fmtPct(Number(value))}</span>
                )}
              />
            }
          />
          <Area
            type="monotone"
            dataKey="premiumPct"
            stroke={stroke}
            strokeWidth={2}
            fill={stroke}
            fillOpacity={0.15}
            dot={false}
            isAnimationActive={false}
          />
          {points.length < 2 && (
            <ReferenceDot
              x={now}
              y={currentPct}
              r={5}
              fill={stroke}
              stroke="none"
            />
          )}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
