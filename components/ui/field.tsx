import { ChevronDown } from "lucide-react";
import type {
  InputHTMLAttributes,
  LabelHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

const base =
  "w-full rounded-lg border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-muted/70 transition-colors hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/25 focus:outline-none disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, "h-10", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, "min-h-24 py-2 leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(base, "h-10 appearance-none pr-8", className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function Label({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-xs font-medium text-ink-soft", className)}
      {...props}
    >
      {children}
    </label>
  );
}

export function FieldError({ children }: { children?: string | string[] }) {
  if (!children) return null;
  const message = Array.isArray(children) ? children[0] : children;
  if (!message) return null;
  return <p role="alert" className="mt-1 text-xs text-danger">{message}</p>;
}

export function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}
