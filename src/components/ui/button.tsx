import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none";

    const variantStyles = {
      primary:
        "bg-[#477A62] text-white hover:bg-[#3B6551] focus:ring-[#477A62] shadow-xs active:scale-[0.99]",
      secondary:
        "bg-[#EAF2EC] text-[#26352E] hover:bg-[#DCE8DF] focus:ring-[#477A62] active:scale-[0.99]",
      outline:
        "border border-[#E3EAE5] bg-white text-[#26352E] hover:bg-[#F8FAF8] hover:border-[#D0DCD3] focus:ring-[#477A62]",
      ghost:
        "text-[#26352E] hover:bg-[#EAF2EC] focus:ring-[#477A62]",
      danger:
        "bg-[#DC2626] text-white hover:bg-[#B91C1C] focus:ring-[#DC2626] shadow-xs active:scale-[0.99]",
    };

    const sizeStyles = {
      sm: "text-sm px-3.5 py-1.5 rounded-xl min-h-[38px]",
      md: "text-base px-5 py-2.5 rounded-xl min-h-[44px]",
      lg: "text-lg px-6 py-3.5 rounded-2xl min-h-[50px]",
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
