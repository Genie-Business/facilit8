import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldClassName } from "@/components/ui/input"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn("flex field-sizing-content min-h-24 py-2.5", fieldClassName, className)}
      {...props}
    />
  )
}

export { Textarea }
