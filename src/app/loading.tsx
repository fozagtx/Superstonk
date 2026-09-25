import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4">
        <Skeleton className="mb-6 h-4 w-2/3" />
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
