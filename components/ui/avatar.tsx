import { cn, initials } from "@/lib/utils";

const TINTS = [
  "bg-accent/20 text-accent-strong",
  "bg-blue/20 text-blue",
  "bg-success/20 text-success",
  "bg-warning/20 text-warning",
  "bg-danger/20 text-danger",
];

export function Avatar({
  name,
  src,
  size = 32,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const tint = TINTS[[...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % TINTS.length];
  const style = { width: size, height: size, fontSize: Math.max(10, size * 0.38) };

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" style={style} className={cn("shrink-0 rounded-full object-cover", className)} />;
  }
  return (
    <span
      style={style}
      className={cn("grid shrink-0 place-items-center rounded-full font-semibold", tint, className)}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
