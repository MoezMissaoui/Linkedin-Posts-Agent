import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  buildAuthorizeUrl,
  getRedirectUri,
  STATE_COOKIE,
  STATE_MAX_AGE,
} from "@/lib/linkedin";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id: agentId } = await ctx.params;
  const url = new URL(req.url);
  const origin = url.origin;
  const returnTo = url.searchParams.get("return") === "list" ? "list" : "edit";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/api/linkedin/connect/${agentId}`;
    return NextResponse.redirect(
      new URL(`/auth/login?next=${encodeURIComponent(next)}`, origin),
    );
  }

  // Verify the agent belongs to the user (RLS enforces this anyway).
  const { data: agent } = await supabase
    .from("agents")
    .select("id")
    .eq("id", agentId)
    .maybeSingle();
  if (!agent) {
    return NextResponse.redirect(new URL("/agents", origin));
  }

  // CSRF nonce + agent binding stored in HttpOnly cookie. The state param
  // sent to LinkedIn is just the nonce; we compare it on callback.
  const nonce = crypto.randomBytes(16).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, JSON.stringify({ nonce, agentId, returnTo }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });

  const redirectUri = getRedirectUri(origin);
  const authUrl = buildAuthorizeUrl(nonce, redirectUri);

  return NextResponse.redirect(authUrl);
}
