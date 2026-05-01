import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendPushToUser } from "@/lib/push/sendPush";
import type { TaskPriority } from "@/lib/types";

interface CreateTaskBody {
  title: string;
  description?: string;
  assigned_to: string;
  site_location?: string;
  priority?: TaskPriority;
  due_date: string;
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
    .select("role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as CreateTaskBody;
  const { title, description, assigned_to, site_location, priority, due_date } =
    body;

  if (!title?.trim() || !assigned_to || !due_date) {
    return NextResponse.json(
      { error: "title, assigned_to and due_date are required" },
      { status: 400 }
    );
  }

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: title.trim(),
      description: description?.trim() ?? null,
      assigned_to,
      created_by: user.id,
      site_location: site_location?.trim() ?? null,
      priority: priority ?? "medium",
      due_date,
      status: "pending",
    })
    .select()
    .single();

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
