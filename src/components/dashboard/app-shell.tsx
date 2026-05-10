"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Menu, X } from "lucide-react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/auth/actions";
import { SidebarNav } from "./sidebar-nav";

type Props = {
  email: string;
  displayName: string;
  children: React.ReactNode;
};

export function AppShell({ email, displayName, children }: Props) {
  const [open, setOpen] = React.useState(false);

  // Close drawer on Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar — sticky to viewport */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col self-start border-r border-border/60 bg-background md:flex">
        <SidebarBody email={email} displayName={displayName} />
      </aside>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-50 md:hidden",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        {/* Backdrop */}
        <div
          onClick={() => setOpen(false)}
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        {/* Panel */}
        <aside
          className={cn(
            "absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-border/60 bg-background shadow-xl transition-transform",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarBody
            email={email}
            displayName={displayName}
            onNavigate={() => setOpen(false)}
            closeButton={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Fermer"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            }
          />
        </aside>
      </div>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Ouvrir la navigation"
            onClick={() => setOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="md:hidden">
            <Logo size="sm" />
          </div>
          <div className="flex-1" />
          <ThemeToggle />
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function SidebarBody({
  email,
  displayName,
  onNavigate,
  closeButton,
}: {
  email: string;
  displayName: string;
  onNavigate?: () => void;
  closeButton?: React.ReactNode;
}) {
  const initials =
    (displayName || email || "?")
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <>
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
        <Link href="/dashboard" onClick={onNavigate}>
          <Logo size="md" />
        </Link>
        {closeButton ?? null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Navigation
        </p>
        <SidebarNav onNavigate={onNavigate} />
      </div>

      <div className="border-t border-border/60 p-3">
        <Link
          href="/profile"
          onClick={onNavigate}
          className="flex w-full items-center gap-3 rounded-md p-2 transition-colors hover:bg-accent"
        >
          <div
            className="grid size-9 shrink-0 place-items-center rounded-full brand-gradient text-sm font-semibold text-white"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {displayName || "Utilisateur"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
        </Link>
        <form action={signOut} className="mt-1">
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="size-4" />
            Déconnexion
          </Button>
        </form>
      </div>
    </>
  );
}
