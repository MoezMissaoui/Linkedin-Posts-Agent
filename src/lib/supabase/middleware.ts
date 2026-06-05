import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";
import type { Database } from "./types";

const PROTECTED_PREFIXES = ["/dashboard", "/profile", "/posts", "/agents"];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

// Behind a reverse proxy, `request.url` reflects the internal bind host
// (0.0.0.0 / 127.0.0.1). Redirect against the canonical public origin when set.
function baseUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ||
    new URL(request.url).origin
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const base = baseUrl(request);

  // Redirect unauthenticated users away from protected pages.
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = new URL("/auth/login", base);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages (except callback/reset-password).
  if (
    user &&
    (pathname === "/auth/login" ||
      pathname === "/auth/register" ||
      pathname === "/auth/forgot-password")
  ) {
    return NextResponse.redirect(new URL("/dashboard", base));
  }

  // Root: route logged-in users to dashboard, others to login.
  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(user ? "/dashboard" : "/auth/login", base),
    );
  }

  return response;
}
