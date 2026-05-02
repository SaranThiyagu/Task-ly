import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export interface OrgContext {
  userId: string;
  orgId: string;
  role: UserRole;
  reportsTo: string | null;
}

/**
 * Get the current user's organization context from their profile.
 * Returns null if not authenticated or profile not found.
 */
export async function getCurrentOrg(): Promise<OrgContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, role, reports_to")
    .eq("id", user.id)
    .single();

  if (!profile?.org_id) return null;

  return {
    userId: user.id,
    orgId: profile.org_id,
    role: profile.role,
    reportsTo: profile.reports_to,
  };
}
