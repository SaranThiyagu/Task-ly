import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const preferredId = "6d7b6896-3130-47dd-8d54-8455a5ab9833";

const { data: preferred } = await supabase
  .from("tasks")
  .select("id,status")
  .eq("id", preferredId)
  .maybeSingle();

const { data: fallback } = await supabase
  .from("tasks")
  .select("id,status")
  .limit(1)
  .maybeSingle();

const task = preferred ?? fallback;

if (!task) {
  console.log("No task rows available to probe.");
  process.exit(0);
}

const taskId = task.id;
const originalStatus = task.status;

const candidates = [
  "in_progress",
  "inprogress",
  "todo",
  "pending",
  "started",
  "active",
  "under_review",
  "underreview",
  "approved",
  "completed",
  "rejected",
  "overdue",
];

console.log("Probing task:", taskId, "original status:", originalStatus);

for (const status of candidates) {
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", taskId);

  if (error) {
    console.log(status, "=> ERROR", error.message);
  } else {
    console.log(status, "=> OK");
  }
}

await supabase.from("tasks").update({ status: originalStatus }).eq("id", taskId);
console.log("Restored original status:", originalStatus);
