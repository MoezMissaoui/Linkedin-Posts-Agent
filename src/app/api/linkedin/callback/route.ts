import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import {
  exchangeCode,
  getRedirectUri,
  getUserInfo,
  STATE_COOKIE,
} from "@/lib/linkedin";

type ReturnTo = "edit" | "list";

function buildReturnUrl(
  origin: string,
  agentId: string | null,
  status: string,
  returnTo: ReturnTo,
) {
  if (returnTo === "list" && agentId) {
    const u = new URL("/agents", origin);
    u.searchParams.set("drawer", "linkedin");
    u.searchParams.set("agent", agentId);
    u.searchParams.set("linkedin", status);
    return u;
  }
  const path = agentId ? `/agents/${agentId}` : "/agents";
  return new URL(
    `${path}?linkedin=${encodeURIComponent(status)}`,
    origin,
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  // Behind a reverse proxy, url.origin is the internal bind host
  // (0.0.0.0 / 127.0.0.1). Prefer the canonical public origin for redirects.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  // Always single-use the state cookie.
  const cookieStore = await cookies();
  const stored = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  let agentId: string | null = null;
  let expectedNonce: string | null = null;
  let returnTo: ReturnTo = "edit";
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as {
        nonce?: string;
        agentId?: string;
        returnTo?: ReturnTo;
      };
      agentId = parsed.agentId ?? null;
      expectedNonce = parsed.nonce ?? null;
      returnTo = parsed.returnTo === "list" ? "list" : "edit";
    } catch {
      /* fall through */
    }
  }

  const back = (status: string) =>
    NextResponse.redirect(buildReturnUrl(origin, agentId, status, returnTo));

  if (oauthError) {
    return back(oauthError);
  }
  if (!stored || !expectedNonce || !agentId) {
    return back("expired");
  }
  if (!code || !state || state !== expectedNonce) {
    return back("invalid_state");
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

    // Fetch the LinkedIn member identity so the UI can show the connected
    // account (avatar + name) and n8n can post without an extra call.
    let memberId: string | null = null;
    let memberName: string | null = null;
    let memberPicture: string | null = null;
    try {
      const info = await getUserInfo(tokens.access_token);
      memberId = info.sub ?? null;
      memberName = info.name ?? null;
      memberPicture = info.picture ?? null;
    } catch (e) {
      console.error(
        "[linkedin callback] userinfo failed",
        e instanceof Error ? e.message : e,
      );
    }

    // Auto-activate if the agent already has at least one schedule config.
    // Mirrors the DB trigger so the intent is explicit in app code as well.
    const { count: configCount } = await supabase
      .from("agent_schedule_config")
      .select("id", { count: "exact", head: true })
      .eq("agent_id", agentId);
    const shouldActivate = (configCount ?? 0) > 0;

    const now = new Date().toISOString();
    const { error: dbError } = await supabase
      .from("agents")
      .update({
        linkedin_access_token: tokens.access_token,
        linkedin_member_id: memberId,
        linkedin_member_name: memberName,
        linkedin_member_picture: memberPicture,
        linkedin_connected_at: now,
        ...(shouldActivate ? { active: true } : {}),
        updated_at: now,
      })
      .eq("id", agentId);

    if (dbError) {
      console.error("[linkedin callback] db error", dbError.message);
      return back("db_error");
    }

    return back("connected");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[linkedin callback] exchange error", msg);
    return back("exchange_error");
  }
}
