import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#F7FAFB] px-4 text-center">
      <Link href="/">
        <Image src="/brand/logo.png" alt="Facilit8" width={120} height={60} priority />
      </Link>
      <div>
        <p className="text-sm font-medium text-brand">404</p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-foreground">Page not found</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
      </div>
      <Button render={<Link href="/" />} nativeButton={false} className="rounded-full">
        Back to home
      </Button>
    </div>
  );
}
