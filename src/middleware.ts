import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes an authenticated-but-profile-incomplete user is still allowed to
// visit. Everything else redirects to /complete-profile until they fill it
// out. /auth covers /auth/callback (so OAuth code exchange completes before
// the gate fires) and /auth/signout (escape hatch from the form).
const GATE_ALLOWLIST_EXACT = new Set([
  "/complete-profile",
  "/login",
  "/signup",
  "/pricing",
]);
const GATE_ALLOWLIST_PREFIXES = ["/auth/"];

function isAllowlistedForGate(path: string): boolean {
  if (GATE_ALLOWLIST_EXACT.has(path)) return true;
  return GATE_ALLOWLIST_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// Two responsibilities, in order:
//   1. Profile-completion gate: if the user signed in via Google OAuth (or
//      otherwise has user_profiles.profile_completed_at IS NULL), bounce
//      them to /complete-profile until they fill out the form. The
//      allowlist above keeps sign-out, sign-in pages, and pricing reachable.
//   2. Persona redirect: authed users hitting `/` with no ?persona= override
//      get redirected to /?persona=<their-profile-persona> so the dashboard
//      renders immediately without a Landing flicker.
// Anonymous visitors fall through both checks.
export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);

  if (!user) return response;

  const url = new URL(request.url);
  const path = url.pathname;
  const isRoot = path === "/";
  const hasPersonaParam = url.searchParams.has("persona");
  const isEmbed = url.searchParams.get("mode") === "embed";

  // Skip the DB round-trip on allowlisted paths — they don't need profile
  // data to render and the gate doesn't apply to them.
  if (isAllowlistedForGate(path)) return response;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("persona, tier, profile_completed_at")
    .eq("user_id", user.id)
    .maybeSingle();

  // Gate: incomplete profile and outside the allowlist → bounce to /complete-profile.
  if (profile && !profile.profile_completed_at) {
    const dest = new URL("/complete-profile", url.origin);
    return NextResponse.redirect(dest);
  }

  // Persona normalization at root. Signed-in non-admin users always see their
  // profile persona — URL overrides are reserved for admin (afs_internal) and
  // anonymous visitors, matching the persona-switcher visibility rule. If their
  // URL persona is missing OR drifted from their profile (e.g. after a profile
  // edit), redirect to fix it.
  if (profile?.persona && isRoot && !isEmbed) {
    const isAdmin = profile.tier === "afs_internal";
    const urlPersona = url.searchParams.get("persona");
    const needsFix = !isAdmin
      ? urlPersona !== profile.persona
      : !hasPersonaParam;
    if (needsFix) {
      url.searchParams.set("persona", profile.persona);
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on everything except static assets, image-optimization, and
    // Next.js internals. /auth/callback is included so the session cookie
    // gets set on the redirect back from Supabase.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
