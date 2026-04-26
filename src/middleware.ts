import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Authed users hitting `/` with no ?persona= override get redirected to
// /?persona=<their-profile-persona> so the dashboard renders immediately
// without a Landing flicker. Anonymous users fall through.
export async function middleware(request: NextRequest) {
  const { response, supabase, user } = await updateSession(request);

  const url = new URL(request.url);
  const isRoot = url.pathname === "/";
  const hasPersonaParam = url.searchParams.has("persona");
  const isEmbed = url.searchParams.get("mode") === "embed";

  if (user && isRoot && !hasPersonaParam && !isEmbed) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("persona")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.persona) {
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
