"use client";

import { useState } from "react";
import { Copy, Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { fmtPct } from "@/lib/format";

export function ShareTokenDialog({
  symbol,
  premiumPct,
}: {
  symbol: string;
  premiumPct: number;
}) {
  const [open, setOpen] = useState(false);
  const ogUrl = `/api/og/token/${symbol}`;

  const pageUrl = () =>
    `${window.location.origin}/token/${symbol}`;
  const tweetText = () =>
    `${symbol} is trading ${fmtPct(premiumPct)} ${
      premiumPct >= 0 ? "above" : "below"
    } fair value on PreStocks. Know what you hold → ${pageUrl()}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(pageUrl());
    toast("Link copied");
  };

  const download = async () => {
    const res = await fetch(ogUrl);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${symbol}-xray.png`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Share2 /> Share
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share {symbol} X-Ray</DialogTitle>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ogUrl}
          alt={`${symbol} premium card`}
          className="w-full rounded-lg border border-border"
        />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={copyLink}>
            <Copy /> Copy link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText())}`,
                "_blank",
              )
            }
          >
            Post on X
          </Button>
          <Button variant="outline" size="sm" onClick={download}>
            <Download /> Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
