"use client";

import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DrawerProps) {
  // Body scroll lock + Escape close.
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-50",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-[400ms] ease-soft",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "drawer-title" : undefined}
        className={cn(
          "absolute right-0 top-0 h-svh w-full overflow-hidden border-l border-border/60 bg-background shadow-2xl transition-transform duration-[400ms] ease-swift lg:w-1/2",
          open ? "translate-x-0" : "translate-x-full",
          className,
        )}
      >
        <div className="flex h-full flex-col">
          {(title || description) && (
            <header className="flex items-start justify-between gap-3 border-b border-border/60 px-6 py-4">
              <div className="min-w-0 flex-1">
                {title ? (
                  <h2
                    id="drawer-title"
                    className="truncate text-lg font-semibold tracking-tight"
                  >
                    {title}
                  </h2>
                ) : null}
                {description ? (
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fermer"
                onClick={onClose}
                className="shrink-0"
              >
                <X className="size-4" />
              </Button>
            </header>
          )}
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        </div>
      </aside>
    </div>
  );
}

export function DrawerTabs({
  tabs,
  active,
  onChange,
  className,
}: {
  tabs: { value: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 p-1",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.value === active;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
