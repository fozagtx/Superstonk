import Link from "next/link";
import { ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
      <Link href="/" className="flex items-center gap-2 font-bold">
        <ScanLine className="size-5" style={{ color: "var(--accent)" }} />
        Pre-IPO X-Ray
      </Link>
      <div className="flex items-center gap-3">
        <Link
          href="/discount"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Discount watch
        </Link>
        <Button variant="outline" size="sm">
          <Link href="/me">View my holdings (read-only)</Link>
        </Button>
      </div>
    </header>
  );
}
