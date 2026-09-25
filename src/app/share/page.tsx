import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = new URLSearchParams({
    v: sp.v ?? "0",
    f: sp.f ?? "0",
    s: sp.s ?? "",
  }).toString();
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const og = `${base}/api/og/portfolio?${q}`;
  return {
    title: "My Pre-IPO X-Ray",
    description: "Fair value vs hype in a PreStocks portfolio.",
    openGraph: { images: [og] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

export default async function SharePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  const q = new URLSearchParams({
    v: sp.v ?? "0",
    f: sp.f ?? "0",
    s: sp.s ?? "",
  }).toString();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 pb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/og/portfolio?${q}`}
          alt="Portfolio X-Ray card"
          className="w-full max-w-2xl rounded-xl border border-border"
        />
        <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
          Open Pre-IPO X-Ray
        </Button>
      </main>
    </>
  );
}
