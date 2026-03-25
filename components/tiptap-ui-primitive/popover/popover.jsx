"use client"

import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/tiptap-utils"
import "@/components/tiptap-ui-primitive/popover/popover.scss"

function resolvePortalContainer() {
  if (typeof document === "undefined") {
    return undefined
  }

  return document.querySelector("dialog[open]") || document.body
}

function Popover({
  ...props
}) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger({
  ...props
}) {
  return <PopoverPrimitive.Trigger {...props} />;
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  container,
  ...props
}) {
  return (
    <PopoverPrimitive.Portal container={container ?? resolvePortalContainer()}>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn("tiptap-popover", className)}
        {...props} />
    </PopoverPrimitive.Portal>
  );
}

export { Popover, PopoverTrigger, PopoverContent }
