import { cn } from "@/lib/utils";

interface LogoProps {
  /** Accent color (default: school theme via --accent-brand). */
  color?: string;
  className?: string;
  /** Show the word "Ensemble" next to the symbol. */
  withWordmark?: boolean;
}

const NAVY = "#1C3A5E";

/** SVG logo: six hands in a circle (alternating navy/accent) around a central heart. Pass withWordmark to show the "Ensemble" wordmark. */
export function Logo({ color = "var(--accent-brand)", className, withWordmark = true }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-ink", className)}>
      <svg
        viewBox="0 0 48 48"
        className="h-full w-auto"
        role="img"
        aria-label="Ensemble"
        fill="none"
      >
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i * 60 * Math.PI) / 180;
          const cx = 24 + Math.cos(angle) * 14;
          const cy = 24 + Math.sin(angle) * 14;
          return (
            <g key={i} transform={`rotate(${i * 60} ${cx} ${cy})`}>
              {/* paume */}
              <rect
                x={cx - 4}
                y={cy - 3}
                width={8}
                height={6}
                rx={3}
                fill={i % 2 === 0 ? NAVY : color}
              />
              {/* doigts stylisés */}
              <rect
                x={cx - 3.5}
                y={cy - 6.5}
                width={1.7}
                height={4}
                rx={0.85}
                fill={i % 2 === 0 ? NAVY : color}
              />
              <rect
                x={cx - 0.9}
                y={cy - 7}
                width={1.7}
                height={4.5}
                rx={0.85}
                fill={i % 2 === 0 ? NAVY : color}
              />
              <rect
                x={cx + 1.8}
                y={cy - 6.5}
                width={1.7}
                height={4}
                rx={0.85}
                fill={i % 2 === 0 ? NAVY : color}
              />
            </g>
          );
        })}
        {/* cœur central */}
        <path
          d="M24 28.2c-3.2-2.3-5.2-4.1-5.2-6.4 0-1.7 1.3-2.9 2.9-2.9 1 0 1.8.5 2.3 1.2.5-.7 1.3-1.2 2.3-1.2 1.6 0 2.9 1.2 2.9 2.9 0 2.3-2 4.1-5.2 6.4Z"
          fill={color}
        />
      </svg>
      {withWordmark && (
        <span className="text-[22px] font-800 tracking-tightest leading-none">Ensemble</span>
      )}
    </span>
  );
}
