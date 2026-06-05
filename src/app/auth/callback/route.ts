import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Behind a reverse proxy, `request.url` reflects the internal bind host
// (0.0.0.0 / 127.0.0.1), so building redirects from it leaks that host to the
// browser. Always redirect against the canonical public origin when set.
function baseUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    new URL(request.url).origin
  );
}

// Only allow internal redirect targets (no open redirect to external hosts).
function safePath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }
  return next;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const base = baseUrl(request);
  const code = url.searchParams.get("code");
  const next = safePath(url.searchParams.get("next"));
  const error = url.searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(error)}`, base),
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(exchangeError.message)}`,
          base,
        ),
      );
    }
  }

  return NextResponse.redirect(new URL(next, base));
}
