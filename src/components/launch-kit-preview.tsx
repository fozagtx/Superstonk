"use client";

import { useState } from "react";
import { CopyButton } from "@/components/copy-button";

export function LaunchKitPreview({ kit }: { kit: unknown }) {
  const [expanded, setExpanded] = useState(false);
  const value = JSON.stringify(kit, null, 2);
  const lines = value.split("\n");
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">launch-kit.json</span>
        <div className="flex items-center gap-2"><button type="button" onClick={() => setExpanded((open) => !open)} className="text-xs text-muted-foreground hover:text-foreground">{expanded ? "Collapse" : "Expand"}</button><CopyButton value={value} label="Copy JSON" /></div>
      </div>
      <pre className={`overflow-auto p-3 text-xs leading-5 text-muted-foreground ${expanded ? "max-h-[620px]" : "max-h-[380px]"}`}>{expanded ? value : lines.slice(0, 20).join("\n") + (lines.length > 20 ? "\n…" : "")}</pre>
    </div>
  );
}
