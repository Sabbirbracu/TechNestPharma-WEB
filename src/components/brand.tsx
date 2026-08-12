import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * TechNest Pharma identity. The wordmark is rendered as text rather than baked
 * into the image so it stays crisp at any size and follows the theme; only the
 * TN mark comes from the logo asset.
 *
 * Colour split matches the artwork: "Tech" navy blue, "Nest" green, "Pharma" 
 * also navy blue to match the brand's primary color.
 */
export function BrandMark({
  className,
  size = 36,
  inverted = false,
}: {
  className?: string;
  size?: number;
  /** Use the light-on-dark artwork — the default mark's navy goes muddy on a
   *  dark surface like the ERP sidebar. */
  inverted?: boolean;
}) {
  return (
    <Image
      src={inverted ? "/logo-mark-dark.png" : "/logo-mark.png"}
      alt=""
      width={size}
      height={size}
      priority
      className={cn("shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

type LockupSize = "sm" | "md" | "lg";

const SIZES: Record<
  LockupSize,
  { mark: number; name: string; sub: string; gap: string }
> = {
  sm: { mark: 36, name: "text-sm", sub: "text-[10px]", gap: "gap-2.5" },
  md: { mark: 48, name: "text-lg", sub: "text-[11px]", gap: "gap-3" },
  lg: { mark: 72, name: "text-2xl", sub: "text-xs", gap: "gap-4" },
};

export function BrandLockup({
  className,
  size = "sm",
  showTagline = false,
  inverted = false,
}: {
  className?: string;
  size?: LockupSize;
  showTagline?: boolean;
  inverted?: boolean;
}) {
  const s = SIZES[size];

  return (
    <span className={cn("flex items-center", s.gap, className)}>
      <BrandMark size={s.mark} inverted={inverted} />
      <span className="flex flex-col leading-tight">
        <span 
          className={cn("font-bold tracking-tighter", s.name)}
          style={{ 
            fontFamily: "'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif",
            letterSpacing: '-0.03em',
            fontWeight: 700
          }}
        >
          {inverted ? (
            <>
              <span className="text-white">Tech</span>
              <span className="text-success">Nest</span>{" "}
              <span className="text-white">Pharma</span>
            </>
          ) : (
            <>
              <span className="text-primary">Tech</span>
              <span className="text-success">Nest</span>{" "}
              <span className="text-primary">Pharma</span>
            </>
          )}
        </span>
        <span
          className={cn(
            "font-bold uppercase",
            inverted ? "text-sidebar-foreground/50" : "text-muted-foreground",
            s.sub,
          )}
          style={{ 
            fontFamily: "'Inter', 'SF Pro Display', -apple-system, system-ui, sans-serif",
            letterSpacing: '0.15em',
            fontWeight: 600
          }}
        >
          {showTagline ? "Smart sourcing. Stronger healthcare." : "Sourcing ERP"}
        </span>
      </span>
    </span>
  );
}
