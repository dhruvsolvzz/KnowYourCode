import React from "react";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "retro bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 pixelated font-bold uppercase",
        className
      )}
      {...props}
    />
  );
});
Button.displayName = "Button";
