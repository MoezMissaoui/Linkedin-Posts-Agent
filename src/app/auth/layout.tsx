import Link from "next/link";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-svh flex flex-col">
      {/* Decorative background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 size-[28rem] rounded-full brand-gradient opacity-25 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 size-[32rem] rounded-full brand-gradient opacity-20 blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link href="/" className="group">
          <Logo size="md" />
        </Link>
        <ThemeToggle />
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="relative z-10 px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Postilys
      </footer>
    </div>
  );
}
