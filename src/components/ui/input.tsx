import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = ({
  className,
  type = "text",
  ...props
}: React.ComponentProps<"input">): React.JSX.Element => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-xl border border-sand-300/80 bg-sand-50/80 px-3 py-1 text-sm text-ink-900 shadow-inner placeholder:text-ink-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/35",
        className
      )}
      {...props}
    />
  );
};
