import { SiteHeader } from "@/components/site-header";
import { Dashboard } from "@/components/dashboard";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <div className="mb-6">
          <h1 className="mb-1 text-xl font-bold">
            Your paycheck, invested while you sleep.
          </h1>
          <p className="text-sm text-muted-foreground">
            US markets are open 9:30am–4pm ET — the hours you&apos;re at work.
            Your agent buys PreStocks pre-IPO tokens on a schedule, nights and
            weekends included.
          </p>
        </div>
        <Dashboard />
      </main>
      <footer className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pb-6 text-xs text-muted-foreground">
        <span>Solana · PreStocks · Clawpump · Meteora</span>
        <span>Data, not financial advice.</span>
      </footer>
    </>
  );
}
