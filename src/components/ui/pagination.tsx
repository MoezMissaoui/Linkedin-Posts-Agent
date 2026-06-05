import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  currentPage: number;
  pageCount: number;
  basePath: string;
  /** Search params to preserve in every link (page is overridden). */
  searchParams?: URLSearchParams;
  className?: string;
};

export function Pagination({
  currentPage,
  pageCount,
  basePath,
  searchParams,
  className,
}: Props) {
  if (pageCount <= 1) return null;

  const buildHref = (page: number) => {
    const params = new URLSearchParams(searchParams ?? "");
    if (page <= 1) {
      params.delete("page");
    } else {
      params.set("page", String(page));
    }
    const qs = params.toString();
    return `${basePath}${qs ? `?${qs}` : ""}`;
  };

  const pages = getPageNumbers(currentPage, pageCount);
  const hasPrev = currentPage > 1;
  const hasNext = currentPage < pageCount;

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn(
        "flex items-center justify-center gap-1 pt-2",
        className,
      )}
    >
      <PaginationLink
        href={buildHref(currentPage - 1)}
        disabled={!hasPrev}
        aria-label="Page précédente"
      >
        <ChevronLeft className="size-4" />
      </PaginationLink>

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`ellipsis-${i}`}
            className="px-2 text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <PaginationLink
            key={p}
            href={buildHref(p)}
            active={p === currentPage}
            aria-current={p === currentPage ? "page" : undefined}
            aria-label={`Page ${p}`}
          >
            {p}
          </PaginationLink>
        ),
      )}

      <PaginationLink
        href={buildHref(currentPage + 1)}
        disabled={!hasNext}
        aria-label="Page suivante"
      >
        <ChevronRight className="size-4" />
      </PaginationLink>
    </nav>
  );
}

function PaginationLink({
  href,
  children,
  active,
  disabled,
  ...rest
}: {
  href: string;
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  const className = cn(
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border/60 px-3 text-sm transition-colors",
    active
      ? "border-primary/40 bg-primary/10 font-medium text-foreground"
      : "text-muted-foreground hover:border-foreground/30 hover:bg-accent hover:text-foreground",
    disabled && "pointer-events-none opacity-40",
  );

  if (disabled) {
    return (
      <span className={className} aria-disabled {...rest}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} scroll={false} className={className} {...rest}>
      {children}
    </Link>
  );
}

/**
 * Returns a compact page list with ellipsis. Examples (current/total):
 *   2/3   -> [1, 2, 3]
 *   1/8   -> [1, 2, "...", 8]
 *   4/8   -> [1, "...", 3, 4, 5, "...", 8]
 *   8/8   -> [1, "...", 7, 8]
 */
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}
