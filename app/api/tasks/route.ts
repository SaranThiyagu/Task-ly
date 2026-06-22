import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/sendPush";
import type { TaskPriority } from "@/lib/types";

interface CreateTaskBody {
  title: string;
  description?: string;
  assigned_to: string;
  site_location?: string;
  site_id?: string;
  priority?: TaskPriority;
  due_date: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function looksLikeSchemaMismatch(errorMessage: string): boolean {
  const m = errorMessage.toLowerCase();
  return (
    m.includes("schema cache") ||
    m.includes("could not find") ||
    m.includes("column") ||
    m.includes("assigned_to") ||
    m.includes("created_by") ||
    m.includes("org_id") ||
    m.includes("site_id")
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only supervisors and managers may create tasks
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, org_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as CreateTaskBody;
  const { title, description, assigned_to, site_location, site_id, priority, due_date } =
    body;

  if (!title?.trim() || !assigned_to || !due_date) {
    return NextResponse.json(
      { error: "title, assigned_to and due_date are required" },
      { status: 400 }
    );
  }

  // Validate assignee belongs to the same organization
  const { data: assignee } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", assigned_to)
    .single();

  if (!assignee || assignee.org_id !== profile.org_id) {
    return NextResponse.json(
      { error: "Cannot assign tasks to users outside your organization" },
      { status: 403 }
    );
  }

  const taskId = crypto.randomUUID();

  const modernPayload = {
    id: taskId,
    title: title.trim(),
    description: description?.trim() ?? null,
    assigned_to,
    created_by: user.id,
    org_id: profile.org_id,
    site_id: site_id ?? null,
    site_location: site_location?.trim() ?? null,
    priority: priority ?? "medium",
    due_date,
    status: "pending",
  };

  let { data: task, error } = await supabase
    .from("tasks")
    .insert(modernPayload)
    .select()
    .single();

  if (error && looksLikeSchemaMismatch(error.message)) {
    let fallbackAssignedToId = assigned_to;
    const { data: existingAssigned } = await supabase
      .from("tasks")
      .select("assigned_to_id")
      .not("assigned_to_id", "is", null)
      .limit(1)
      .maybeSingle();

    if (
      existingAssigned?.assigned_to_id &&
      !UUID_REGEX.test(existingAssigned.assigned_to_id) &&
      UUID_REGEX.test(assigned_to)
    ) {
      fallbackAssignedToId = existingAssigned.assigned_to_id;
    }

    const { data: existingCategory } = await supabase
      .from("tasks")
      .select("category_id")
      .not("category_id", "is", null)
      .limit(1)
      .maybeSingle();

    const legacyPriority =
      (priority ?? "medium") === "critical" ? "high" : priority ?? "medium";

    const legacyPayload: Record<string, unknown> = {
      id: taskId,
      title: title.trim(),
      description: description?.trim() ?? null,
      status: "todo",
      priority: legacyPriority,
      due_date,
      assigned_to_id: fallbackAssignedToId,
    };

    if (existingCategory?.category_id) {
      legacyPayload.category_id = existingCategory.category_id;
    }

    const fallbackInsert = await supabase
      .from("tasks")
      .insert(legacyPayload)
      .select()
      .single();

    task = fallbackInsert.data;
    error = fallbackInsert.error;
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Push notification to assigned staff
  await sendPushToUser(assigned_to, {
    title: "New Task Assigned 📋",
    body: `${title} — due ${new Date(due_date).toLocaleDateString()}`,
    url: "/staff/tasks",
    tag: `new-task-${task.id}`,
  });

  return NextResponse.json({ task }, { status: 201 });
}
