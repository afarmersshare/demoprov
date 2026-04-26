"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Server action invoked from the /profile display-name form. Trims, caps
// length to keep the nav chip readable, and writes via the SSR Supabase
// client so RLS sees auth.uid() = user_id (covered by the
// "user updates own profile" policy in 008_auth_users.sql).
//
// Tier and persona are intentionally NOT updatable here — those changes
// flow through admin tooling backed by the service-role key.
export async function updateDisplayName(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const raw = String(formData.get("display_name") ?? "").trim();
  const display_name = raw.length === 0 ? null : raw.slice(0, 80);

  await supabase
    .from("user_profiles")
    .update({ display_name })
    .eq("user_id", user.id);

  revalidatePath("/profile");
  revalidatePath("/");
}
