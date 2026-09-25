import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader } from "@/components/site-header";

export default function Loading() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12">
        <Skeleton className="mb-3 h-4 w-32" />
        <Skeleton className="mb-2 h-9 w-96 max-w-full" />
        <Skeleton className="mb-8 h-5 w-[32rem] max-w-full" />
        <Skeleton className="mb-3 h-6 w-40" />
        <Skeleton className="mb-8 h-64 w-full rounded-xl" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-3 h-72 w-full rounded-xl" />
      </main>
    </>
  );
}
