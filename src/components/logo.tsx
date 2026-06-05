import * as React from "react";

import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg" | "xl";

type LogoProps = {
  size?: LogoSize;
  showWordmark?: boolean;
  className?: string;
};

const TILE_SIZE: Record<LogoSize, string> = {
  sm: "size-7 rounded-md",
  md: "size-9 rounded-lg",
  lg: "size-12 rounded-xl",
  xl: "size-16 rounded-2xl",
};

const INNER_SIZE: Record<LogoSize, string> = {
  sm: "size-4",
  md: "size-5",
  lg: "size-7",
  xl: "size-9",
};

const TEXT_SIZE: Record<LogoSize, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-3xl",
};

export function Logo({
  size = "md",
  showWordmark = true,
  className,
}: LogoProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative grid place-items-center brand-gradient text-white shadow-lg shadow-primary/25 ring-1 ring-white/15",
          TILE_SIZE[size],
        )}
        aria-hidden
      >
        <LogoMark className={INNER_SIZE[size]} />
      </div>
      {showWordmark ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            TEXT_SIZE[size],
          )}
        >
          Postilys
        </span>
      ) : null}
    </div>
  );
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5 3.5h7.5a5.5 5.5 0 0 1 0 11H8.5V20H5V3.5Zm3.5 3v5H12.5a2.5 2.5 0 0 0 0-5H8.5Z"
        fill="currentColor"
      />
      <circle cx="18.6" cy="5.4" r="1.6" fill="currentColor" opacity="0.85" />
    </svg>
  );
}
