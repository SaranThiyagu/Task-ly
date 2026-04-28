"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function resolveEscalation(escalationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("escalations")
    .update({ is_resolved: true })
    .eq("id", escalationId);

  if (error) return { error: error.message };

  revalidatePath("/manager/escalations");
  revalidatePath("/manager/dashboard");
  return { error: null };
}

export async function reopenEscalation(escalationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("escalations")
    .update({ is_resolved: false })
    .eq("id", escalationId);

  if (error) return { error: error.message };

  revalidatePath("/manager/escalations");
  revalidatePath("/manager/dashboard");
  return { error: null };
}
