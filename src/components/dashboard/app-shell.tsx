"use client";

import * as React from "react";
import Link from "next/link";
import {
  LogOut,
  Menu,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  User as UserIcon,
  X,
} from "lucide-react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "@/app/auth/actions";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { SidebarNav } from "./sidebar-nav";

type Props = {
  email: string;
  displayName: string;
  defaultCollapsed?: boolean;
  children: React.ReactNode;
};

export function AppShell({
  email,
  displayName,
  defaultCollapsed = false,
  children,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  // Close drawer on Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  };

  return (
    <div className="flex min-h-svh">
      {/* Desktop sidebar — sticky to viewport, collapsible */}
      <aside
        className={cn(
          "sticky top-0 hidden h-svh shrink-0 flex-col self-start border-r border-border/60 bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-swift md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <SidebarBody
          email={email}
          displayName={displayName}
          collapsed={collapsed}
        />
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
            "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-[400ms] ease-soft",
            open ? "opacity-100" : "opacity-0",
          )}
        />
        {/* Panel */}
        <aside
          className={cn(
            "absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r border-border/60 bg-sidebar text-sidebar-foreground shadow-xl transition-transform duration-[400ms] ease-swift",
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="hidden md:inline-flex"
            aria-label={
              collapsed ? "Déployer la sidebar" : "Réduire la sidebar"
            }
            onClick={toggleCollapsed}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
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
  collapsed = false,
}: {
  email: string;
  displayName: string;
  onNavigate?: () => void;
  closeButton?: React.ReactNode;
  collapsed?: boolean;
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
      <div
        className={cn(
          "flex h-14 items-center gap-2 border-b border-border/60",
          collapsed ? "justify-center px-2" : "justify-between px-5",
        )}
      >
        <Link
          href="/dashboard"
          onClick={onNavigate}
          aria-label="Postilys"
          className={collapsed ? "inline-flex" : undefined}
        >
          <Logo size="sm" showWordmark={!collapsed} />
        </Link>
        {!collapsed && (closeButton ?? null)}
      </div>

      <div
        className={cn(
          "flex-1 overflow-y-auto py-4",
          collapsed ? "px-2" : "px-3",
        )}
      >
        {!collapsed ? (
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
            Navigation
          </p>
        ) : null}
        <SidebarNav onNavigate={onNavigate} collapsed={collapsed} />
      </div>

      <div
        className={cn(
          "border-t border-border/60",
          collapsed ? "p-2" : "p-3",
        )}
      >
        <UserMenu
          email={email}
          displayName={displayName}
          initials={initials}
          onNavigate={onNavigate}
          collapsed={collapsed}
        />
      </div>
    </>
  );
}

function UserMenu({
  email,
  displayName,
  initials,
  onNavigate,
  collapsed = false,
}: {
  email: string;
  displayName: string;
  initials: string;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const closeAndNavigate = () => {
    setOpen(false);
    onNavigate?.();
  };

  return (
    <div ref={containerRef} className="relative">
      {collapsed ? (
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={displayName || email || "Menu utilisateur"}
          title={displayName || email}
          onClick={() => setOpen((o) => !o)}
          className="grid size-10 w-full place-items-center rounded-md transition-colors hover:bg-accent"
        >
          <span
            className="grid size-9 shrink-0 place-items-center rounded-full brand-gradient text-sm font-semibold text-white"
            aria-hidden
          >
            {initials}
          </span>
        </button>
      ) : (
        <div className="flex items-center gap-2 rounded-md p-2">
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-label="Ouvrir le menu utilisateur"
            onClick={() => setOpen((o) => !o)}
          >
            <MoreVertical className="size-4" />
          </Button>
        </div>
      )}

      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute bottom-full z-50 mb-2 w-52 overflow-hidden rounded-md border border-border/60 bg-popover p-1 shadow-lg origin-bottom-right animate-pop-in",
            collapsed ? "left-0 origin-bottom-left" : "right-0",
          )}
        >
          <Link
            href="/profile"
            role="menuitem"
            onClick={closeAndNavigate}
            className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-popover-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <UserIcon className="size-4 text-muted-foreground" />
            Profil
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Se déconnecter
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
