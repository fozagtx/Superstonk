import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { getOnChainSupply } from "@/lib/solana";
import { fmtTokens } from "@/lib/format";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export async function SupplyBadge({
  mint,
  apiSupply,
}: {
  mint: string;
  apiSupply: number;
}) {
  let onchain: number | null = null;
  try {
    onchain = await getOnChainSupply(mint);
  } catch {
    onchain = null;
  }

  if (onchain === null || onchain === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <ShieldQuestion className="size-3.5" />
        Couldn&apos;t verify on-chain right now
      </span>
    );
  }

  const match = Math.abs(onchain - apiSupply) / apiSupply <= 0.001;
  if (match) {
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <span className="inline-flex cursor-default items-center gap-1.5 text-xs font-medium" />
          }
        >
          <ShieldCheck className="size-3.5" style={{ color: "var(--accent)" }} />
          <span style={{ color: "var(--accent)" }}>Verified on Solana</span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="num">
            on-chain {fmtTokens(onchain)} · API {fmtTokens(apiSupply)}
          </span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-medium"
      style={{ color: "var(--warning)" }}
    >
      <ShieldAlert className="size-3.5" />
      Supply mismatch: on-chain{" "}
      <span className="num">{fmtTokens(onchain)}</span> vs API{" "}
      <span className="num">{fmtTokens(apiSupply)}</span>
    </span>
  );
}
