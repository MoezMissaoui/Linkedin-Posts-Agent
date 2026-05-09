// LinkedIn OAuth 2.0 helpers (3-legged, server-only).
//
// Required LinkedIn app products:
//   - Sign In with LinkedIn using OpenID Connect
//   - Share on LinkedIn
// Required scopes for posting on the user's behalf:
//   - openid, profile, email   (OIDC identity)
//   - w_member_social          (post on the member's behalf)

const AUTHORIZE_URL = "https://www.linkedin.com/oauth/v2/authorization";
const TOKEN_URL = "https://www.linkedin.com/oauth/v2/accessToken";
const USERINFO_URL = "https://api.linkedin.com/v2/userinfo";

export const SCOPES = ["openid", "profile", "email", "w_member_social"];

export const STATE_COOKIE = "linkedin_oauth_state";
export const STATE_MAX_AGE = 60 * 10; // 10 minutes

export type LinkedinTokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
};

export type LinkedinUserInfo = {
  sub: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
  locale?: string;
};

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function getClientId(): string {
  return required("LINKEDIN_CLIENT_ID", process.env.LINKEDIN_CLIENT_ID);
}

function getClientSecret(): string {
  return required("LINKEDIN_CLIENT_SECRET", process.env.LINKEDIN_CLIENT_SECRET);
}

export function getRedirectUri(origin: string): string {
  return (
    process.env.LINKEDIN_REDIRECT_URI ||
    `${origin}/api/linkedin/callback`
  );
}

export function buildAuthorizeUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: redirectUri,
    state,
    scope: SCOPES.join(" "),
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<LinkedinTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: getClientId(),
    client_secret: getClientSecret(),
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `LinkedIn token exchange failed (${res.status}): ${text || "no body"}`,
    );
  }

  return (await res.json()) as LinkedinTokenResponse;
}

export async function getUserInfo(
  accessToken: string,
): Promise<LinkedinUserInfo> {
  const res = await fetch(USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `LinkedIn userinfo failed (${res.status}): ${text || "no body"}`,
    );
  }

  return (await res.json()) as LinkedinUserInfo;
}
