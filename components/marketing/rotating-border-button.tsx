import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export function RotatingBorderButton({
  href,
  children,
  className,
}: {
  href: string;
  children: string;
  className?: string;
}) {
  return (
    <div className={cn("btn-border-wrap", className)}>
      <Link href={href} className="rotating-cta">
        <span className="relative z-10">{children}</span>
        <span className="relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full bg-white/15">
          <ArrowRight className="size-3.5 text-white" />
        </span>
      </Link>
    </div>
  );
}
