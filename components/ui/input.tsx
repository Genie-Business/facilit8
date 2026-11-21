import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/**
 * One look for every text-like form control: a clearly visible outline on a white field (so it stands
 * out from the page behind it), a stronger outline on hover, and a thick teal focus ring. 44px tall on
 * phones (comfortable to tap), 40px on larger screens. 16px text on phones so iOS doesn't zoom in.
 */
export const fieldClassName =
  "w-full min-w-0 rounded-lg border border-field bg-card px-3.5 text-base text-foreground shadow-xs transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-muted-foreground/70 hover:border-field-hover focus-visible:border-action focus-visible:ring-4 focus-visible:ring-action/20 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/15 aria-invalid:focus-visible:border-destructive aria-invalid:focus-visible:ring-destructive/25 md:text-sm motion-reduce:transition-none"

/** The same look for a native <select>. */
export const nativeSelectClassName = cn("h-11 md:h-10 pr-8", fieldClassName)

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-11 md:h-10 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        fieldClassName,
        className
      )}
      {...props}
    />
  )
}

export { Input }
