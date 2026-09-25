import { Circle, Triangle } from "lucide-react";
import type { Verdict } from "@/lib/metrics";
import { cn } from "cn";

const config: Record<
  Verdict,
  { label: string; colorVar: string; iconClass: string }
> = {
  overpriced: {
    label: "Overpriced",
    colorVar: "var(--overpriced)",
    iconClass: "size-3 fill-current",
  },
  fair: {
    label: "Fair",
    colorVar: "var(--fair)",
    iconClass: "size-3 fill-current",
  },
  discount: {
    label: "Discount",
    colorVar: "var(--discount)",
    iconClass: "size-3 rotate-180 fill-current",
  },
};

export function VerdictChip({
  verdict,
  className,
}: {
  verdict: Verdict;
  className?: string;
}) {
  const { label, colorVar, iconClass } = config[verdict];
  const Icon = verdict === "fair" ? Circle : Triangle;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-bold uppercase tracking-[0.04em]",
        className,
      )}
      style={{
        color: colorVar,
        backgroundColor: `color-mix(in oklch, ${colorVar} 12%, transparent)`,
      }}
    >
      <Icon className={iconClass} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
