import { TriangleAlert } from "lucide-react";

export function StaleBanner() {
  return (
    <div
      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
      style={{
        color: "var(--warning)",
        borderColor:
          "color-mix(in oklch, var(--warning) 40%, transparent)",
        backgroundColor:
          "color-mix(in oklch, var(--warning) 10%, transparent)",
      }}
      role="status"
    >
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      Showing the last saved snapshot — live PreStocks data is temporarily
      unavailable.
    </div>
  );
}
