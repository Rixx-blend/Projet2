import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "icon";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-gradient text-accent-ink shadow-glow hover:brightness-110 active:brightness-95 active:scale-[0.99]",
  secondary:
    "bg-panel-2 text-ink hover:bg-line border border-line hover:border-line-strong",
  ghost: "text-ink-soft hover:text-ink hover:bg-white/5",
  outline: "border border-line text-ink hover:border-line-strong hover:bg-white/5",
  danger: "bg-danger/12 text-danger hover:bg-danger/20 border border-danger/30",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  icon: "h-9 w-9",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150",
        "disabled:cursor-not-allowed disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
}
