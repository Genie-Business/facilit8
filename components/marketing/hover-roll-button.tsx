import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

const VARIANTS = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  dark: "bg-foreground text-background hover:bg-foreground/85",
  outline: "border border-border bg-white text-foreground hover:border-brand",
} as const;

const ARROW_VARIANTS = {
  primary: "text-brand",
  dark: "text-foreground",
  outline: "text-foreground",
} as const;

export function HoverRollButton({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: string;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-3 rounded-full py-2 pr-2 pl-6 text-sm font-medium transition-colors",
        VARIANTS[variant],
        className
      )}
    >
      <span className="h-[20px] overflow-hidden">
        <span
          aria-hidden={false}
          className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2"
        >
          <span className="h-[20px] leading-[20px]">{children}</span>
          <span aria-hidden="true" className="h-[20px] leading-[20px]">
            {children}
          </span>
        </span>
      </span>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white">
        <ArrowRight
          className={cn(
            "size-3.5 transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45",
            ARROW_VARIANTS[variant]
          )}
        />
      </span>
    </Link>
  );
}
