import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground hover:bg-secondary/90",
        primary:
          "bg-primary text-secondary border border-secondary hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:
          "border border-secondary bg-background text-secondary hover:bg-secondary hover:text-secondary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-secondary underline-offset-4 hover:underline",

        lime: "bg-lime text-lime-foreground font-medium hover:bg-lime/90",
        ink: "bg-ink text-ink-foreground hover:bg-ink/90",
        forest: "bg-forest text-forest-foreground hover:bg-forest/90",
        rust: "bg-rust text-rust-foreground hover:bg-rust/90",
        surface:
          "bg-surface border border-hairline text-ink hover:bg-bone shadow-none",
        subtle: "bg-bone text-ink hover:bg-muted border border-hairline/60",
        // Marketing-page primary CTA (home hero "Give to a cause").
        accent: "bg-blue-accent text-white shadow-xl hover:bg-blue-accent/90",
        // No colors or hover of its own: the caller supplies them in className.
        bare: "",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        pill: "h-12 gap-2 rounded-full px-6",
        // No height or padding of its own: the caller supplies them in className.
        bare: "h-auto px-0 py-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
