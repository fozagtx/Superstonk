import { SiteHeader } from "@/components/site-header";
import { EarningsPanel } from "@/components/earnings-panel";

export default function AgentPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <h1 className="mb-1 text-xl font-bold">The agent token</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          The agent&apos;s own token trades on a Meteora bonding curve quoted in
          SPACEX. Its trading fees keep the agent running.
        </p>
        <EarningsPanel />
      </main>
    </>
  );
}
