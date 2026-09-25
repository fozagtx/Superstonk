import { SiteHeader } from "@/components/site-header";
import { FundingCard } from "@/components/funding-card";

export default function FundPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <h1 className="mb-1 text-xl font-bold">Fund your agent</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          USDC into the agent wallet becomes scheduled buys. SOL covers network
          fees.
        </p>
        <FundingCard />
      </main>
    </>
  );
}
