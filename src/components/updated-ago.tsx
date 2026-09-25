"use client";

import { useEffect, useState } from "react";
import { relativeTime } from "@/lib/format";

export function UpdatedAgo({ iso }: { iso: string }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  return <span className="num">updated {relativeTime(iso)}</span>;
}
