"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F7FAFB] px-4 text-center">
      <div>
        <p className="text-sm font-medium text-brand">Error</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-foreground">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          An unexpected error occurred. You can try again, or head back to the homepage.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => reset()} className="rounded-full">
          Try again
        </Button>
        <Button
          variant="outline"
          render={<Link href="/" />}
          nativeButton={false}
          className="rounded-full"
        >
          Back to home
        </Button>
      </div>
    </div>
  );
}
