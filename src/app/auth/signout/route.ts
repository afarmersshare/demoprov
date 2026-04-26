import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST /auth/signout — server-side sign-out so the SSR Supabase client
// clears the session cookies on its way out. Posted from the AuthChip
// in the top nav (and any other future logout entry point). 303 forces
// the browser to follow the redirect with GET, which is correct for
// POST→GET transitions and avoids form-resubmission prompts.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
