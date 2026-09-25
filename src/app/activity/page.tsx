import { SiteHeader } from "@/components/site-header";
import { ActivityFeed } from "@/components/activity-feed";

export default function ActivityPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-10">
        <h1 className="mb-1 text-xl font-bold">What your agent did</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Every buy with the price, the amount, and a plain-language reason.
        </p>
        <ActivityFeed />
      </main>
    </>
  );
}
