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
      "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer";

    const variantStyles = {
      primary: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-500",
      secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 focus:ring-slate-400",
      outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 focus:ring-teal-500",
      ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-300",
      danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
    };

    const sizeStyles = {
      sm: "text-xs px-2.5 py-1.5",
      md: "text-sm px-4 py-2",
      lg: "text-base px-5 py-2.5",
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
