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
import { fmtUsd } from "@/lib/format";

export function ShareXRayDialog({
  totalValue,
  fairValue,
  symbols,
}: {
  totalValue: number;
  fairValue: number;
  symbols: string[];
}) {
  const [open, setOpen] = useState(false);
  const q = `v=${totalValue.toFixed(0)}&f=${fairValue.toFixed(0)}&s=${symbols.join(",")}`;
  const ogUrl = `/api/og/portfolio?${q}`;
  const shareUrl = () => `${window.location.origin}/share?${q}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl());
    toast("Link copied");
  };

  const download = async () => {
    const res = await fetch(ogUrl);
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "my-xray.png";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const tweetText = () =>
    `My PreStocks portfolio: ${fmtUsd(totalValue)} total, ${fmtUsd(
      Math.abs(totalValue - fairValue),
    )} ${
      totalValue - fairValue >= 0 ? "hidden premium" : "below fair value"
    }. Know what you hold → ${shareUrl()}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        <Share2 /> Share my X-Ray
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share my X-Ray</DialogTitle>
        </DialogHeader>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={ogUrl}
          alt="My portfolio X-Ray card"
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
