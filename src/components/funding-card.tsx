"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Wallet, Landmark } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface AgentData {
  user: { agent_wallet: string | null; demo: boolean };
  wallets: { usdc_balance?: number; sol_balance?: number }[];
  walletError: string | null;
}

export function FundingCard() {
  const auth = useAuth();
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [amount, setAmount] = useState("50");

  useEffect(() => {
    if (!auth.signedIn) return;
    auth
      .apiFetch("/api/agent")
      .then((r) => r.json())
      .then(setAgent)
      .catch(() => {});
  }, [auth]);

  const address = agent?.user.agent_wallet ?? null;

  useEffect(() => {
    if (!address) return;
    QRCode.toDataURL(`solana:${address}`, { margin: 1, width: 200 }).then(
      setQr,
    );
  }, [address]);

  if (!auth.signedIn) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6">
          <Button onClick={auth.login}>Sign in to fund your agent</Button>
        </CardContent>
      </Card>
    );
  }
  if (!agent) return <Skeleton className="h-64 w-full rounded-xl" />;

  const copy = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const record = async () => {
    const usdc = Number(amount);
    if (!Number.isFinite(usdc) || usdc <= 0) return;
    const res = await auth.apiFetch("/api/agent/fund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountUsdc: usdc }),
    });
    if (res.ok) {
      toast.success(`Recorded ${usdc} USDC funding`);
    } else {
      toast.error("Could not record the funding");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="size-4" style={{ color: "var(--accent)" }} />
            Send USDC to your agent
            {agent.user.demo && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
                demo
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Send USDC plus about 0.02 SOL for fees to this address. The agent
            only ever spends from its own wallet and can only send money back
            to yours.
          </p>
          <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/40 p-4">
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Agent wallet QR code" className="rounded-md" />
            )}
            <button
              onClick={copy}
              className="num flex max-w-full items-center gap-1.5 truncate text-xs hover:text-foreground"
            >
              <span className="truncate">{address}</span>
              {copied ? (
                <Check className="size-3.5 shrink-0" style={{ color: "var(--discount)" }} />
              ) : (
                <Copy className="size-3.5 shrink-0" />
              )}
            </button>
          </div>
          <div className="num flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Balance</span>
            <span>
              {agent.user.demo
                ? "$0.00 USDC"
                : `${agent.wallets[0]?.usdc_balance ?? 0} USDC · ${agent.wallets[0]?.sol_balance?.toFixed(4) ?? "0"} SOL`}
            </span>
          </div>
          {agent.walletError && (
            <p className="text-xs text-muted-foreground">
              Balance lookup failed: {agent.walletError}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="size-4" /> I sent it
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">
              Amount sent (USDC)
            </label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="num"
            />
          </div>
          <Button onClick={record}>Record</Button>
        </CardContent>
      </Card>
    </div>
  );
}
