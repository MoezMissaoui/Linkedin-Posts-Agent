import Link from "next/link";
import { LogOut, User } from "lucide-react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "@/app/auth/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { MainNav } from "@/components/main-nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-svh flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/dashboard">
              <Logo size="md" />
            </Link>
            <MainNav />
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className={buttonVariants({ variant: "ghost", size: "sm" })}
              aria-label="Profil"
            >
              <User className="size-4" />
              <span className="hidden sm:inline">Profil</span>
            </Link>
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Déconnexion</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        {children}
      </main>
    </div>
  );
}
