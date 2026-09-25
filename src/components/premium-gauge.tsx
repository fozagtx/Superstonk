const MIN = -40;
const MAX = 40;

export function PremiumGauge({ premiumPct }: { premiumPct: number }) {
  const clamped = Math.min(MAX, Math.max(MIN, premiumPct));
  const pos = ((clamped - MIN) / (MAX - MIN)) * 100;
  const fairStart = ((-5 - MIN) / (MAX - MIN)) * 100;
  const fairWidth = ((5 - -5) / (MAX - MIN)) * 100;

  return (
    <div className="w-full">
      <div
        className="relative flex h-2.5 w-full overflow-hidden rounded-full"
        role="img"
        aria-label={`Premium gauge, ${premiumPct.toFixed(1)} percent`}
      >
        <div
          className="h-full"
          style={{
            width: `${fairStart}%`,
            backgroundColor:
              "color-mix(in oklch, var(--discount) 35%, transparent)",
          }}
        />
        <div
          className="h-full"
          style={{ width: `${fairWidth}%`, backgroundColor: "var(--surface-raised)" }}
        />
        <div
          className="h-full flex-1"
          style={{
            backgroundColor:
              "color-mix(in oklch, var(--overpriced) 35%, transparent)",
          }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-foreground"
          style={{ left: `calc(${pos}% - 1px)` }}
        />
      </div>
      <div className="num mt-1.5 flex justify-between text-xs text-muted-foreground">
        <span>−40%</span>
        <span>fair zone</span>
        <span>+40%</span>
      </div>
    </div>
  );
}
