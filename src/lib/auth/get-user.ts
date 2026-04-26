import { createClient } from "@/lib/supabase/server";
import type { Persona } from "@/components/farms/network-explorer";

export type Tier =
  | "farmer_free"
  | "farmer_paid"
  | "buyer_institutional"
  | "buyer_foodhub"
  | "buyer_grocery"
  | "buyer_foodservice"
  | "buyer_farmersmarket"
  | "buyer_processor"
  | "government"
  | "nonprofit"
  | "funder"
  | "aggregator_licensed"
  | "afs_internal"
  | "demo";

export type ModuleSlug =
  | "map"
  | "network"
  | "flows"
  | "list"
  | "directory"
  | "county"
  | "dashboard"
  | "pipeline"
  | "reports";

export type AuthedUser = {
  userId: string;
  email: string | null;
  displayName: string | null;
  tier: Tier;
  persona: Persona;
  entitledModules: ModuleSlug[];
};

// Returns the current authed user's profile + entitlements, or null if
// nobody is signed in. Single trip to Supabase: profile and entitlements
// fetched in parallel after the auth.getUser() call.
export async function getAuthedUser(): Promise<AuthedUser | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: entitlements }] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("tier, persona, display_name")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("user_module_entitlements")
      .select("module_slug")
      .eq("user_id", user.id),
  ]);

  if (!profile) return null;

  return {
    userId: user.id,
    email: user.email ?? null,
    displayName: profile.display_name,
    tier: profile.tier as Tier,
    persona: profile.persona as Persona,
    entitledModules: (entitlements ?? []).map(
      (row: { module_slug: string }) => row.module_slug as ModuleSlug,
    ),
  };
}
