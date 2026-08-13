import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href }: { href: string }) {
  return (
    <Link href={href} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-3.5" />
      Back
    </Link>
  );
}
