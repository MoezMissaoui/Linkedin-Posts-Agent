// Postilys — password-recovery session confinement.
//
// Clicking a Supabase reset link establishes a full session (via
// exchangeCodeForSession) BEFORE the password is actually changed. To avoid a
// reset link behaving like a free login, we mark such sessions with this
// cookie and restrict them — in the middleware — to the reset-password page
// only. The cookie is cleared once the password is successfully updated (or on
// sign-out).

export const RECOVERY_COOKIE = "postilys_pw_recovery";
export const RECOVERY_MAX_AGE = 60 * 60; // 1 hour, matches the link lifetime
