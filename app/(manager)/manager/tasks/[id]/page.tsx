import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  ShieldAlert,
  Flame,
  Users,
  CalendarDays,
  FileText,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type { TaskPriority, TaskStatus } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

const PRIORITY_STYLES: Record<
  TaskPriority,
  { bg: string; text: string; label: string }
> = {
  critical: { bg: "bg-red-500", text: "text-white", label: "Critical" },
  high: { bg: "bg-orange-500", text: "text-white", label: "High" },
  medium: { bg: "bg-yellow-300", text: "text-yellow-900", label: "Medium" },
  low: { bg: "bg-emerald-500", text: "text-white", label: "Low" },
};

const STATUS_STYLES: Record<
  TaskStatus,
  { bg: string; text: string; label: string }
> = {
  pending: { bg: "bg-slate-200", text: "text-slate-700", label: "Pending" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-700", label: "In Progress" },
  completed: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Completed" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  overdue: { bg: "bg-red-500", text: "text-white", label: "Overdue" },
};

export default async function ManagerTaskDetailPage({ params }: PageProps) {
  const { id } = await params;
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

  /* ── Fetch task with profiles ── */
  const { data: task } = await supabase
    .from("tasks")
    .select(
      `*,
       assigned_to_profile:profiles!tasks_assigned_to_fkey(id, full_name, avatar_url, role, email),
       created_by_profile:profiles!tasks_created_by_fkey(id, full_name, avatar_url, role, email)`,
    )
    .eq("id", id)
    .eq("org_id", profile.org_id)
    .single();

  if (!task) notFound();

  /* ── Fetch escalations for this task ── */
  const { data: escalations } = await supabase
    .from("escalations")
    .select(
      `id, reason, escalated_at, is_resolved,
       from_profile:profiles!escalations_escalated_from_fkey(id, full_name, avatar_url),
       to_profile:profiles!escalations_escalated_to_fkey(id, full_name, avatar_url)`,
    )
    .eq("task_id", id)
    .eq("org_id", profile.org_id)
    .order("escalated_at", { ascending: false });

  /* ── Fetch review ── */
  const { data: reviews } = await supabase
    .from("task_reviews")
    .select(
      `id, action, comment, reviewed_at,
       reviewer:profiles!task_reviews_reviewed_by_fkey(id, full_name, avatar_url)`,
    )
    .eq("task_id", id)
    .eq("org_id", profile.org_id)
    .order("reviewed_at", { ascending: false });

  /* ── Fetch evidence ── */
  const { data: evidence } = await supabase
    .from("task_evidence")
    .select("id, photo_url, notes, submitted_at")
    .eq("task_id", id)
    .eq("org_id", profile.org_id)
    .order("submitted_at", { ascending: false });

  /* ── Derived values ── */
  const now = new Date();
  const dueDate = new Date(task.due_date);
  const isOverdue =
    (task.status === "pending" || task.status === "in_progress") &&
    isPast(dueDate);
  const displayStatus: TaskStatus = isOverdue ? "overdue" : task.status;
  const openEscalations = (escalations || []).filter((e) => !e.is_resolved);
  const hasEscalation = openEscalations.length > 0;

  const assignee = Array.isArray(task.assigned_to_profile)
    ? task.assigned_to_profile[0]
    : task.assigned_to_profile;
  const creator = Array.isArray(task.created_by_profile)
    ? task.created_by_profile[0]
    : task.created_by_profile;

  const statusStyle = STATUS_STYLES[displayStatus];
  const priorityStyle = PRIORITY_STYLES[task.priority as TaskPriority];

  return (
    <div className="space-y-6 pb-10">
      {/* ── Back navigation ── */}
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/manager/tasks"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All Tasks
        </Link>
        <Link
          href="/manager/escalations"
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12px] font-bold text-amber-700 shadow-sm transition hover:bg-amber-100"
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          View Escalations
        </Link>
      </div>

      {/* ── Task header card ── */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {/* Priority bar */}
        <div
          className={`h-1.5 w-full ${
            task.priority === "critical"
              ? "bg-red-500"
              : task.priority === "high"
                ? "bg-orange-500"
                : task.priority === "medium"
                  ? "bg-yellow-400"
                  : "bg-emerald-500"
          }`}
        />

        <div className="p-6">
          {/* Badges */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-sm ${statusStyle.bg} ${statusStyle.text}`}
            >
              {displayStatus === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}
              {displayStatus === "rejected" && <XCircle className="h-3.5 w-3.5" />}
              {displayStatus === "overdue" && <AlertOctagon className="h-3.5 w-3.5" />}
              {statusStyle.label}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider shadow-sm ${priorityStyle.bg} ${priorityStyle.text}`}
            >
              {(task.priority === "critical" || task.priority === "high") && (
                <Flame className="h-3.5 w-3.5" />
              )}
              {priorityStyle.label}
            </span>
            {hasEscalation && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                <ShieldAlert className="h-3.5 w-3.5" />
                {openEscalations.length} Open Escalation{openEscalations.length > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            {task.title}
          </h1>

          {/* Description */}
          {task.description && (
            <p className="mt-3 text-[14px] leading-relaxed text-slate-600">
              {task.description}
            </p>
          )}

          {/* Meta grid */}
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Assigned to */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Users className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Assigned To
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  <UserAvatar
                    name={assignee?.full_name || "?"}
                    avatarUrl={assignee?.avatar_url ?? null}
                    size="sm"
                    className="h-5 w-5 rounded-full"
                  />
                  <p className="text-[13px] font-bold text-slate-900">
                    {assignee?.full_name || "Unassigned"}
                  </p>
                </div>
              </div>
            </div>

            {/* Created by (supervisor) */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                <Users className="h-4 w-4 text-indigo-500" />
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Supervisor
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  {creator ? (
                    <>
                      <UserAvatar
                        name={creator.full_name}
                        avatarUrl={creator.avatar_url ?? null}
                        size="sm"
                        className="h-5 w-5 rounded-full"
                      />
                      <p className="text-[13px] font-bold text-slate-900">
                        {creator.full_name}
                      </p>
                    </>
                  ) : (
                    <p className="text-[13px] text-slate-400">—</p>
                  )}
                </div>
              </div>
            </div>

            {/* Site */}
            {task.site_location && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  <MapPin className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Site
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-slate-900">
                    {task.site_location}
                  </p>
                </div>
              </div>
            )}

            {/* Due date */}
            <div className="flex items-start gap-3">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  isOverdue ? "bg-red-100" : "bg-amber-50"
                }`}
              >
                <CalendarDays
                  className={`h-4 w-4 ${isOverdue ? "text-red-500" : "text-amber-500"}`}
                />
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Due Date
                </p>
                <p
                  className={`mt-1 text-[13px] font-bold ${
                    isOverdue ? "text-red-600" : "text-slate-900"
                  }`}
                >
                  {format(dueDate, "MMM d, yyyy · h:mm a")}
                </p>
                {isOverdue && (
                  <p className="text-[11px] font-bold text-red-500">
                    {formatDistanceToNowStrict(dueDate)} overdue
                  </p>
                )}
              </div>
            </div>

            {/* Created at */}
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <Clock className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                  Created
                </p>
                <p className="mt-1 text-[13px] font-bold text-slate-900">
                  {format(new Date(task.created_at), "MMM d, yyyy")}
                </p>
              </div>
            </div>

            {/* Completed at */}
            {task.completed_at && (
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                    Completed
                  </p>
                  <p className="mt-1 text-[13px] font-bold text-emerald-700">
                    {format(new Date(task.completed_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column: Escalations + Reviews ── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Escalations */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
                Escalation History
              </h2>
              <p className="text-[11.5px] text-slate-500">
                {(escalations || []).length === 0
                  ? "No escalations"
                  : `${openEscalations.length} open · ${(escalations || []).length} total`}
              </p>
            </div>
          </header>

          {(escalations || []).length === 0 ? (
            <EmptyBlock
              icon={<CheckCircle2 className="h-6 w-6 text-emerald-400" />}
              message="No escalations for this task"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(escalations || []).map((esc) => {
                const isCritical =
                  typeof esc.reason === "string" &&
                  esc.reason.startsWith("CRITICAL:");
                const cleanReason =
                  typeof esc.reason === "string"
                    ? esc.reason.replace(/^CRITICAL:\s*/i, "")
                    : esc.reason;
                const from = Array.isArray(esc.from_profile)
                  ? esc.from_profile[0]
                  : esc.from_profile;
                const to = Array.isArray(esc.to_profile)
                  ? esc.to_profile[0]
                  : esc.to_profile;

                return (
                  <li key={esc.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                          isCritical
                            ? "bg-red-500 text-white"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {isCritical ? (
                          <Flame className="h-4 w-4" />
                        ) : (
                          <ShieldAlert className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isCritical && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                              Critical
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              esc.is_resolved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {esc.is_resolved ? "Resolved" : "Open"}
                          </span>
                        </div>
                        <p className="mt-1 text-[12.5px] italic text-slate-600">
                          &ldquo;{cleanReason}&rdquo;
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          {from && (
                            <span className="inline-flex items-center gap-1">
                              <UserAvatar
                                name={(from as { full_name: string }).full_name}
                                avatarUrl={(from as { avatar_url: string | null }).avatar_url}
                                size="sm"
                                className="h-4 w-4 rounded-full"
                              />
                              <span className="font-bold text-slate-700">
                                {(from as { full_name: string }).full_name}
                              </span>
                              <span>→</span>
                            </span>
                          )}
                          {to && (
                            <span className="font-bold text-slate-700">
                              {(to as { full_name: string }).full_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(esc.escalated_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Reviews */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-indigo-500 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
                Review History
              </h2>
              <p className="text-[11.5px] text-slate-500">
                {(reviews || []).length === 0
                  ? "Not yet reviewed"
                  : `${(reviews || []).length} review${(reviews || []).length > 1 ? "s" : ""}`}
              </p>
            </div>
          </header>

          {(reviews || []).length === 0 ? (
            <EmptyBlock
              icon={<Clock className="h-6 w-6 text-slate-300" />}
              message="No reviews yet"
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {(reviews || []).map((rev) => {
                const isApproved = rev.action === "approved";
                const reviewer = Array.isArray(rev.reviewer)
                  ? rev.reviewer[0]
                  : rev.reviewer;
                return (
                  <li key={rev.id} className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-sm ${
                          isApproved
                            ? "bg-emerald-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {isApproved ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                              isApproved
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {isApproved ? "Approved" : "Rejected"}
                          </span>
                        </div>
                        {rev.comment && (
                          <p className="mt-1 text-[12.5px] italic text-slate-600">
                            &ldquo;{rev.comment}&rdquo;
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                          {reviewer && (
                            <span className="inline-flex items-center gap-1">
                              <UserAvatar
                                name={(reviewer as { full_name: string }).full_name}
                                avatarUrl={(reviewer as { avatar_url: string | null }).avatar_url}
                                size="sm"
                                className="h-4 w-4 rounded-full"
                              />
                              <span className="font-bold text-slate-700">
                                {(reviewer as { full_name: string }).full_name}
                              </span>
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(rev.reviewed_at), "MMM d, h:mm a")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* ── Evidence ── */}
      {(evidence || []).length > 0 && (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 shadow-sm">
              <FileText className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
                Evidence Submitted
              </h2>
              <p className="text-[11.5px] text-slate-500">
                {(evidence || []).length} file{(evidence || []).length > 1 ? "s" : ""}
              </p>
            </div>
          </header>
          <ul className="divide-y divide-slate-100">
            {(evidence || []).map((ev) => (
              <li key={ev.id} className="flex items-start gap-4 px-5 py-4">
                {ev.photo_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ev.photo_url}
                    alt="Evidence photo"
                    className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                  />
                )}
                <div className="min-w-0">
                  {ev.notes && (
                    <p className="text-[13px] text-slate-700">{ev.notes}</p>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400">
                    {format(new Date(ev.submitted_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function EmptyBlock({
  icon,
  message,
}: {
  icon: React.ReactNode;
  message: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-100">
        {icon}
      </div>
      <p className="text-[13px] font-semibold text-slate-500">{message}</p>
    </div>
  );
}
