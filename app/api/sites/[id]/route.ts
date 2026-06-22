import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Shared: resolve and authorise the manager making the request, and verify
 *  the target site belongs to their org. Returns the site row or an error response. */
async function resolveManagerAndSite(siteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manager") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const { data: site } = await supabase
    .from("sites")
    .select("id, org_id")
    .eq("id", siteId)
    .single();

  if (!site || site.org_id !== profile.org_id) {
    return { error: NextResponse.json({ error: "Site not found" }, { status: 404 }) };
  }

  return { supabase, profile };
}

/** PATCH /api/sites/[id] — update name and/or address. Manager only. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resolved = await resolveManagerAndSite(id);
  if (resolved.error) return resolved.error;
  const { supabase } = resolved;

  const body = await req.json().catch(() => ({}));
  const updates: Record<string, string | null> = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json({ error: "Site name cannot be empty" }, { status: 400 });
    }
    updates.name = name;
  }

  if ("address" in body) {
    updates.address = typeof body.address === "string" ? body.address.trim() || null : null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: site, error } = await supabase!
    .from("sites")
    .update(updates)
    .eq("id", id)
    .select("id, name, address, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ site });
}

/** DELETE /api/sites/[id] — soft-delete (set is_active = false). Manager only.
 *  Preserves historical task location data. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const resolved = await resolveManagerAndSite(id);
  if (resolved.error) return resolved.error;
  const { supabase } = resolved;

  const { error } = await supabase!
    .from("sites")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
