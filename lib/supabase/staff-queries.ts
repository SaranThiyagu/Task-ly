import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Probes the tasks table to determine the correct column name for task
 * assignment, handling legacy schema (assigned_to_id) vs modern (assigned_to).
 *
 * Schema-compat note: live Supabase may use the legacy column `assigned_to_id`
 * instead of the modern `assigned_to`. PostgREST returns a PGRST204 / 42703
 * error when the column doesn't exist — we catch that and fall back.
 */
export async function getAssignedToColumn(
  supabase: SupabaseClient
): Promise<"assigned_to" | "assigned_to_id"> {
  try {
    const { error } = await supabase.from("tasks").select("assigned_to").limit(0);

    if (error) {
      const errorMsg = error.message?.toLowerCase() ?? "";
      const isColError =
        error.code === "PGRST204" ||
        error.code === "42703" ||
        errorMsg.includes("assigned_to") ||
        errorMsg.includes("undefined column");

      if (isColError) {
        console.log(
          "[getAssignedToColumn] Using legacy assigned_to_id column"
        );
        return "assigned_to_id";
      }
    }

    console.log("[getAssignedToColumn] Using modern assigned_to column");
    return "assigned_to";
  } catch (e) {
    console.error("[getAssignedToColumn] Unexpected error:", e);
    // On unexpected error, fall back to legacy
    return "assigned_to_id";
  }
}

/**
 * Checks if org_id column exists in tasks table.
 * Migration 003 adds org_id; legacy schemas don't have it.
 * Returns true if org_id exists, false otherwise.
 */
export async function hasOrgIdColumn(
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { error } = await supabase.from("tasks").select("org_id").limit(0);

    if (error) {
      const errorMsg = error.message?.toLowerCase() ?? "";
      const isColError =
        error.code === "PGRST204" ||
        error.code === "42703" ||
        errorMsg.includes("org_id") ||
        errorMsg.includes("undefined column");

      console.log("[hasOrgIdColumn] Column check:", {
        exists: !isColError,
        errorCode: error.code,
        errorMsg: error.message,
      });

      return !isColError;
    }

    console.log("[hasOrgIdColumn] org_id column exists");
    return true;
  } catch (e) {
    console.error("[hasOrgIdColumn] Unexpected error:", e);
    // On unexpected error, assume column doesn't exist to be safe
    return false;
  }
}
