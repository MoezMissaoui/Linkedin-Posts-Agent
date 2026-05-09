import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  exchangeCode,
  getRedirectUri,
  STATE_COOKIE,
} from "@/lib/linkedin";

function back(origin: string, agentId: string | null, status: string) {
  const path = agentId ? `/agents/${agentId}` : "/agents";
  return NextResponse.redirect(
    new URL(`${path}?linkedin=${encodeURIComponent(status)}`, origin),
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // Always single-use the state cookie.
  const cookieStore = await cookies();
  const stored = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  let agentId: string | null = null;
  let expectedNonce: string | null = null;
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as {
        nonce?: string;
        agentId?: string;
      };
      agentId = parsed.agentId ?? null;
      expectedNonce = parsed.nonce ?? null;
    } catch {
      /* fall through */
    }
  }

  if (oauthError) {
    return back(origin, agentId, oauthError);
  }
  if (!stored || !expectedNonce || !agentId) {
    return back(origin, null, "expired");
  }
  if (!code || !state || state !== expectedNonce) {
    return back(origin, agentId, "invalid_state");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", origin));
  }

  try {
    const tokens = await exchangeCode(code, getRedirectUri(origin));
    const { error: dbError } = await supabase
      .from("agents")
      .update({
        linkedin_access_token: tokens.access_token,
        updated_at: new Date().toISOString(),
      })
      .eq("id", agentId);

    if (dbError) {
      console.error("[linkedin callback] db error", dbError.message);
      return back(origin, agentId, "db_error");
    }

    return back(origin, agentId, "connected");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[linkedin callback] exchange error", msg);
    return back(origin, agentId, "exchange_error");
  }
}
