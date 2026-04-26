import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Shared callback for Google OAuth and magic-link email.
// Supabase appends ?code=... after the user clicks the link or finishes
// the OAuth handshake. We exchange the code for a session (which sets
// cookies via the SSR client) then redirect to / so middleware can route
// the user to their persona dashboard.
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  // Code missing or exchange failed — surface the user back to /login
  // with a generic error flag the form can render.
  return NextResponse.redirect(new URL("/login?error=callback", url.origin));
}
