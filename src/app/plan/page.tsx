import { SiteHeader } from "@/components/site-header";
import { PlanBuilder } from "@/components/plan-builder";

export default function PlanPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <h1 className="mb-1 text-xl font-bold">Set your plan</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          A simple plan — an amount, a token, a frequency — instead of picking
          trades. The agent executes it at any hour.
        </p>
        <PlanBuilder />
      </main>
    </>
  );
}
