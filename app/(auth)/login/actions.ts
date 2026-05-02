"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

const ROLE_DASHBOARDS: Record<UserRole, string> = {
  staff: "/staff/dashboard",
  supervisor: "/supervisor/dashboard",
  manager: "/manager/dashboard",
};

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Please enter both email and password." };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      return { error: "Invalid email or password." };
    }
    return { error: error.message };
  }

  if (!data.user) {
    return { error: "Account not found." };
  }

  // Fetch user role from profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", data.user.id)
    .single();

  const role: UserRole = profile?.role || "staff";
  redirect(ROLE_DASHBOARDS[role]);
}
