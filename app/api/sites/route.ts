import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** GET /api/sites — list active sites for the authenticated user's org.
 *  Accessible to supervisors and managers.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: sites, error } = await supabase
    .from("sites")
    .select("id, name, address, is_active, created_at")
    .eq("org_id", profile.org_id)
    .eq("is_active", true)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sites });
}

/** POST /api/sites — create a new site. Manager role only. */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "manager") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const address = typeof body.address === "string" ? body.address.trim() : null;

  if (!name) {
    return NextResponse.json({ error: "Site name is required" }, { status: 400 });
  }

  const { data: site, error } = await supabase
    .from("sites")
    .insert({ org_id: profile.org_id, name, address: address || null, is_active: true })
    .select("id, name, address, is_active, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ site }, { status: 201 });
}
