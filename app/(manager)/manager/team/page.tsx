import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ManagerTeamClient } from "./client";

/**
 * Manager → Team Performance
 *
 * Per-person breakdown of workload, throughput, and reliability.
 * Includes a role-aware split (staff vs supervisor) and site rollup.
 */
export default async function ManagerTeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "manager") redirect("/login");

  const now = new Date();

  /* ── Pull people + tasks + reviews + escalations ── */
  const [
    { data: people },
    { data: tasks },
    { data: reviews },
    { data: escalations },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, role")
      .in("role", ["staff", "supervisor"])
      .eq("org_id", profile.org_id)
      .order("full_name"),
    supabase
      .from("tasks")
      .select(
        "id, status, priority, site_location, assigned_to, due_date, completed_at, created_at",
      )
      .eq("org_id", profile.org_id),
    supabase
      .from("task_reviews")
      .select("id, task_id, reviewed_by, action, reviewed_at")
      .eq("org_id", profile.org_id),
    supabase
      .from("escalations")
      .select("id, task_id, escalated_to, is_resolved, escalated_at")
      .eq("org_id", profile.org_id),
  ]);

  const allPeople = people || [];
  const allTasks = tasks || [];
  const allReviews = reviews || [];
  const allEscalations = escalations || [];

  /* ── Build escalation count per task assignee ── */
  const escByTaskId = new Map<string, number>();
  for (const e of allEscalations) {
    escByTaskId.set(e.task_id, (escByTaskId.get(e.task_id) || 0) + 1);
  }

  /* ── Per-person aggregates (staff) ── */
  type PersonStats = {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: "staff" | "supervisor";
    assigned: number;
    completed: number;
    inProgress: number;
    overdue: number;
    rejected: number;
    escalations: number;
    onTime: number;
    completionRate: number;
    onTimeRate: number;
    avgCycleHours: number | null;
    lastActivity: string | null;
  };

  const peopleStats: PersonStats[] = allPeople.map((p) => {
    const isStaff = p.role === "staff";
    const isSupervisor = p.role === "supervisor";

    let assigned = 0;
    let completed = 0;
    let inProgress = 0;
    let overdue = 0;
    let rejected = 0;
    let onTime = 0;
    let escalations = 0;
    let cycleSum = 0;
    let cycleCount = 0;
    let lastActivity: string | null = null;

    if (isStaff) {
      for (const t of allTasks) {
        if (t.assigned_to !== p.id) continue;
        assigned += 1;
        if (t.status === "completed") completed += 1;
        if (t.status === "in_progress") inProgress += 1;
        if (t.status === "rejected") rejected += 1;
        if (
          (t.status === "pending" || t.status === "in_progress") &&
          t.due_date &&
          new Date(t.due_date) < now
        )
          overdue += 1;
        if (
          t.status === "completed" &&
          t.completed_at &&
          t.due_date &&
          new Date(t.completed_at) <= new Date(t.due_date)
        )
          onTime += 1;
        if (t.status === "completed" && t.completed_at) {
          const ms =
            new Date(t.completed_at).getTime() -
            new Date(t.created_at).getTime();
          if (ms > 0) {
            cycleSum += ms;
            cycleCount += 1;
          }
          if (!lastActivity || t.completed_at > lastActivity) {
            lastActivity = t.completed_at;
          }
        }
        escalations += escByTaskId.get(t.id) || 0;
      }
    }

    if (isSupervisor) {
      // For supervisors: count their reviews + open escalations targeted at them
      const reviewedByMe = allReviews.filter((r) => r.reviewed_by === p.id);
      assigned = reviewedByMe.length; // tasks reviewed
      completed = reviewedByMe.filter((r) => r.action === "approved").length;
      rejected = reviewedByMe.filter((r) => r.action === "rejected").length;
      inProgress = 0;
      overdue = 0;
      onTime = 0;
      escalations = allEscalations.filter(
        (e) => e.escalated_to === p.id && !e.is_resolved,
      ).length;
      for (const r of reviewedByMe) {
        if (!lastActivity || r.reviewed_at > lastActivity) {
          lastActivity = r.reviewed_at;
        }
      }
    }

    return {
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      role: p.role as "staff" | "supervisor",
      assigned,
      completed,
      inProgress,
      overdue,
      rejected,
      escalations,
      onTime,
      completionRate:
        assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
      onTimeRate:
        completed > 0 && isStaff ? Math.round((onTime / completed) * 100) : 0,
      avgCycleHours:
        cycleCount > 0 ? cycleSum / cycleCount / (1000 * 60 * 60) : null,
      lastActivity,
    };
  });

  /* ── Team-wide totals (staff only) ── */
  const staffStats = peopleStats.filter((p) => p.role === "staff");
  const totals = staffStats.reduce(
    (acc, s) => ({
      assigned: acc.assigned + s.assigned,
      completed: acc.completed + s.completed,
      overdue: acc.overdue + s.overdue,
      onTime: acc.onTime + s.onTime,
    }),
    { assigned: 0, completed: 0, overdue: 0, onTime: 0 },
  );
  const teamCompletionRate =
    totals.assigned > 0
      ? Math.round((totals.completed / totals.assigned) * 100)
      : 0;
  const teamOnTimeRate =
    totals.completed > 0
      ? Math.round((totals.onTime / totals.completed) * 100)
      : 0;

  /* ── Site rollup ── */
  type SiteStats = {
    site: string;
    assigned: number;
    completed: number;
    overdue: number;
    headcount: number;
    completionRate: number;
  };
  const siteMap = new Map<
    string,
    { assigned: number; completed: number; overdue: number; staff: Set<string> }
  >();
  for (const t of allTasks) {
    const site = t.site_location || "Unspecified";
    if (!siteMap.has(site))
      siteMap.set(site, {
        assigned: 0,
        completed: 0,
        overdue: 0,
        staff: new Set<string>(),
      });
    const s = siteMap.get(site)!;
    s.assigned += 1;
    if (t.status === "completed") s.completed += 1;
    if (
      (t.status === "pending" || t.status === "in_progress") &&
      t.due_date &&
      new Date(t.due_date) < now
    )
      s.overdue += 1;
    s.staff.add(t.assigned_to);
  }
  const sites: SiteStats[] = Array.from(siteMap.entries()).map(([site, v]) => ({
    site,
    assigned: v.assigned,
    completed: v.completed,
    overdue: v.overdue,
    headcount: v.staff.size,
    completionRate:
      v.assigned > 0 ? Math.round((v.completed / v.assigned) * 100) : 0,
  }));

  return (
    <ManagerTeamClient
      profile={profile}
      people={peopleStats}
      sites={sites}
      teamTotals={{
        headcount: staffStats.length,
        supervisors: peopleStats.filter((p) => p.role === "supervisor").length,
        assigned: totals.assigned,
        completed: totals.completed,
        overdue: totals.overdue,
        completionRate: teamCompletionRate,
        onTimeRate: teamOnTimeRate,
      }}
    />
  );
}
