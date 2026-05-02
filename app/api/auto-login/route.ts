import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// ── Hardcoded demo credentials (must match Supabase seed users) ──
const DEMO_PASSWORD = "Demo@1234";

const ROLE_CREDENTIALS: Record<string, { email: string; redirect: string }> = {
  staff: {
    email: "sarah.tan@cleanpro-demo.com",
    redirect: "/staff/dashboard",
  },
  supervisor: {
    email: "michael.lim@cleanpro-demo.com",
    redirect: "/supervisor/dashboard",
  },
  manager: {
    email: "david.wong@cleanpro-demo.com",
    redirect: "/manager/dashboard",
  },
};

async function performLogin(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role = (searchParams.get("role") || "staff").toLowerCase();
  const next = searchParams.get("next");

  const creds = ROLE_CREDENTIALS[role];
  if (!creds) {
    return NextResponse.json(
      { error: `Unknown role: ${role}` },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // If already signed in as the same role, just go to the dashboard.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, org_id")
      .eq("id", user.id)
      .single();

    if (profile?.role === role) {
      return NextResponse.redirect(
        new URL(next || creds.redirect, request.url)
      );
    }

    // Different role — sign out before swapping.
    await supabase.auth.signOut();
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: DEMO_PASSWORD,
  });

  if (error) {
    return NextResponse.json(
      {
        error: "Auto-login failed",
        details: error.message,
        hint:
          "Ensure demo users have been seeded in Supabase (see scripts/seedDemoData.ts).",
      },
      { status: 500 }
    );
  }

  return NextResponse.redirect(new URL(next || creds.redirect, request.url));
}

export async function GET(request: NextRequest) {
  return performLogin(request);
}

export async function POST(request: NextRequest) {
  return performLogin(request);
}
