"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fmtPct } from "@/lib/format";

const LS_KEY = "xray.telegramCode";

export function AlertDialog({
  symbol,
  premiumPct,
  configured,
}: {
  symbol: string;
  premiumPct: number;
  configured: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(() =>
    typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null,
  );
  const [linked, setLinked] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [direction, setDirection] = useState<"below" | "above">("below");
  const [threshold, setThreshold] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (o && threshold === "") {
      setThreshold(String(Math.round(premiumPct / 5) * 5));
    }
  };

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }, []);

  const checkLinked = useCallback(
    async (c: string) => {
      const res = await fetch(`/api/telegram/link?code=${encodeURIComponent(c)}`);
      if (!res.ok) return false;
      const body = (await res.json()) as { linked: boolean };
      return body.linked;
    },
    [],
  );

  // on open, check stored code link status
  useEffect(() => {
    if (!open || !code) return;
    void checkLinked(code).then((ok) => setLinked(ok));
    return stopPolling;
  }, [open, code, checkLinked, stopPolling]);

  const connect = async () => {
    const res = await fetch("/api/telegram/link", { method: "POST" });
    if (res.status === 503) {
      toast("Alerts aren't switched on for this deployment yet.");
      return;
    }
    if (!res.ok) {
      toast("Couldn't create a link code — try again.");
      return;
    }
    const { code: c, url } = (await res.json()) as {
      code: string;
      url: string;
    };
    setCode(c);
    localStorage.setItem(LS_KEY, c);
    window.open(url, "_blank");
    setWaiting(true);
    const started = Date.now();
    pollRef.current = setInterval(async () => {
      if (Date.now() - started > 120_000) {
        stopPolling();
        setWaiting(false);
        return;
      }
      if (await checkLinked(c)) {
        stopPolling();
        setWaiting(false);
        setLinked(true);
      }
    }, 2000);
  };

  const thresholdNum = Number(threshold);
  const preview =
    direction === "below"
      ? `Tell me when ${symbol} premium drops below ${fmtPct(thresholdNum || 0)}`
      : `Tell me when ${symbol} premium rises above ${fmtPct(thresholdNum || 0)}`;

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          direction,
          thresholdPct: thresholdNum,
          code,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast(body.error ?? "Couldn't set the alert — try again.");
        return;
      }
      toast("Alert set — check Telegram");
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Bell /> Set alert
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alert me on {symbol}</DialogTitle>
        </DialogHeader>
        {!configured ? (
          <p className="text-sm text-muted-foreground">
            Alerts aren&apos;t switched on for this deployment yet.
          </p>
        ) : !linked ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect Telegram to get premium alerts.
            </p>
            {waiting ? (
              <p className="text-sm text-muted-foreground">
                Waiting for you to press Start in Telegram…
              </p>
            ) : (
              <Button onClick={connect}>Connect Telegram</Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="flex items-center gap-1.5 text-sm">
              <Check
                className="size-4"
                style={{ color: "var(--discount)" }}
              />
              Connected
            </p>
            <Tabs
              value={direction}
              onValueChange={(v) => setDirection(v as "below" | "above")}
            >
              <TabsList>
                <TabsTrigger value="below">Drops below</TabsTrigger>
                <TabsTrigger value="above">Rises above</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                className="num w-28"
                step={1}
              />
              <span className="num text-sm text-muted-foreground">%</span>
            </div>
            <p className="text-sm text-muted-foreground">{preview}</p>
            <Button
              onClick={submit}
              disabled={submitting || Number.isNaN(thresholdNum)}
            >
              {submitting ? "Setting…" : "Set alert"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
