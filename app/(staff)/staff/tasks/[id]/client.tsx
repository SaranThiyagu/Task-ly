"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isPast, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { startTask, resubmitTask } from "./actions";
import { CompleteTaskModal } from "@/components/staff/CompleteTaskModal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Clock,
  CalendarDays,
  User,
  Play,
  CheckCircle2,
  Loader2,
  Camera,
  MessageSquare,
  ShieldCheck,
  XCircle,
  FileImage,
  AlertTriangle,
  Upload,
  Flag,
  Zap,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Badge } from "@/components/ui/badge";
import { useDictionary } from "@/lib/i18n/dictionary-provider";
import { normalizeTaskStatus } from "@/lib/tasks/normalization";
import type {
  Task,
  Profile,
  TaskPriority,
  TaskEvidence,
  TaskReview,
} from "@/lib/types";

interface TaskDetailClientProps {
  task: Task;
  creator: Profile | null;
  evidence: TaskEvidence[];
  reviews: (Omit<TaskReview, "reviewed_by"> & {
    reviewed_by: Profile | null;
  })[];
}

/* ───── Design tokens ─────
   Primary  : #1E3A8A (deep blue)
   Success  : #22C55E (green)
   Warning  : #F59E0B (orange)
   Danger   : #EF4444 (red)
*/

const priorityChip: Record<TaskPriority, string> = {
  low: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200",
  high: "bg-orange-50 text-orange-700 ring-orange-200",
  critical: "bg-red-50 text-red-700 ring-red-200",
};

const priorityDot: Record<TaskPriority, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

const priorityLabel: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function TaskDetailClient({
  task,
  creator,
  evidence,
  reviews,
}: TaskDetailClientProps) {
  const router = useRouter();
  const dict = useDictionary();
  const td = dict.staff.taskDetail;
  const [starting, setStarting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  const normalizedStatus = normalizeTaskStatus(task.status);

  const isOverdue =
    (normalizedStatus === "pending" || normalizedStatus === "in_progress") &&
    isPast(new Date(task.due_date));

  const isCompleted = normalizedStatus === "completed";
  const isRejected = normalizedStatus === "rejected";
  const isInProgress = normalizedStatus === "in_progress";
  const isPending = normalizedStatus === "pending";
  const canAct = isPending || isInProgress || isRejected;

  async function handleStartTask() {
    setStarting(true);
    const result = await startTask(task.id);
    if (result.error) {
      toast.error(result.error);
      setStarting(false);
      return;
    }

    if ("openCompleteModal" in result && result.openCompleteModal) {
      toast.success(td.start_fallback_to_complete ?? td.toast_started);
      setCompleteModalOpen(true);
      setStarting(false);
      return;
    }

    toast.success(td.toast_started);
    router.refresh();
    setStarting(false);
  }

  async function handleResubmit() {
    setResubmitting(true);
    const result = await resubmitTask(task.id);
    if (result.error) {
      toast.error(result.error);
      setResubmitting(false);
      return;
    }
    toast.success(td.toast_reopened);
    router.refresh();
    setResubmitting(false);
  }

  /* Status badge for breadcrumb row */
  const statusBadge = isOverdue
    ? { label: dict.common.status.overdue, cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" }
    : isCompleted
      ? { label: dict.common.status.completed, cls: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" }
      : isInProgress
        ? { label: dict.common.status.in_progress, cls: "bg-blue-50 text-blue-700 ring-blue-200", dot: "bg-blue-500" }
        : isRejected
          ? { label: dict.common.status.rejected, cls: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" }
          : { label: dict.common.status.pending, cls: "bg-slate-50 text-slate-600 ring-slate-200", dot: "bg-slate-400" };

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 pb-32 lg:pb-8">
      {/* ════════ BREADCRUMB / HEADER ════════ */}
      <div className="flex items-center justify-between gap-3 py-4 sm:py-5">
        <button
          onClick={() => router.back()}
          className="-ml-2 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">{td.back}</span>
        </button>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${statusBadge.cls}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${statusBadge.dot} ${
              isOverdue ? "animate-pulse" : ""
            }`}
          />
          {statusBadge.label}
        </span>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px] lg:gap-6">
        {/* ═════════════ LEFT COLUMN ═════════════ */}
        <div className="min-w-0 space-y-5">
          {/* HERO — Title + status */}
          <HeroBanner
            task={task}
            isOverdue={isOverdue}
            isCompleted={isCompleted}
            isRejected={isRejected}
          />

          {/* OVERDUE — Strong escalation callout */}
          {isOverdue && <EscalationCallout dueDate={task.due_date} />}

          {/* PRIMARY CTA on mobile */}
          {canAct && (
            <div className="lg:hidden">
              <PrimaryCTA
                isOverdue={isOverdue}
                isPending={isPending}
                isInProgress={isInProgress}
                isRejected={isRejected}
                starting={starting}
                resubmitting={resubmitting}
                onStart={handleStartTask}
                onComplete={() => setCompleteModalOpen(true)}
                onResubmit={handleResubmit}
              />
            </div>
          )}

          {/* DESCRIPTION */}
          {task.description && (
            <SectionCard title={td.description}>
              <p className="text-[15px] leading-relaxed text-slate-700 whitespace-pre-wrap">
                {task.description}
              </p>
            </SectionCard>
          )}

          {/* INFO GRID */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TaskInfoCard
              tone="blue"
              icon={<MapPin className="h-5 w-5" />}
              label={td.location}
              value={task.site_location || "Not mapped"}
            />
            <TaskInfoCard
              tone="violet"
              icon={<CalendarDays className="h-5 w-5" />}
              label={td.due_date}
              value={format(new Date(task.due_date), "MMM d, yyyy")}
              danger={isOverdue}
            />
            <TaskInfoCard
              tone="amber"
              icon={<Clock className="h-5 w-5" />}
              label={td.due_time}
              value={format(new Date(task.due_date), "h:mm a")}
              danger={isOverdue}
            />
            <TaskInfoCard
              tone="slate"
              icon={
                creator ? (
                  <UserAvatar
                    name={creator.full_name}
                    avatarUrl={creator.avatar_url}
                    size="sm"
                    className="h-10 w-10 ring-0"
                  />
                ) : (
                  <User className="h-5 w-5" />
                )
              }
              iconAsAvatar={!!creator}
              label={td.assigned_by}
              value={creator?.full_name ?? "Unknown"}
            />
          </div>

          {/* EVIDENCE */}
          {evidence.length > 0 && (
            <SectionCard
              title={td.evidence}
              icon={<FileImage className="h-4 w-4 text-[#1E3A8A]" />}
              meta={td.submission_count.replace("{count}", String(evidence.length))}
              compact
            >
              <div className="-mx-5 -mb-5 divide-y divide-slate-100">
                {evidence.map((ev) => (
                  <div key={ev.id} className="space-y-3 px-5 py-4">
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <img
                        src={ev.photo_url}
                        alt="Task evidence"
                        className="w-full max-h-72 object-cover"
                      />
                    </div>
                    {ev.notes && (
                      <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3">
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                        <p className="text-sm leading-relaxed text-slate-700">
                          {ev.notes}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-slate-400">
                      {format(new Date(ev.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {/* ACTIVITY / REVIEWS */}
          {reviews.length > 0 && (
            <SectionCard
              title={td.activity}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-600" />}
              meta={td.review_count.replace("{count}", String(reviews.length))}
              compact
            >
              <div className="relative space-y-5 pl-6">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                {reviews.map((review) => {
                  const reviewer = review.reviewed_by;
                  const approved = review.action === "approved";
                  return (
                    <div key={review.id} className="relative">
                      <div
                        className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full ring-4 ring-white ${
                          approved ? "bg-emerald-500" : "bg-red-500"
                        }`}
                      />
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {reviewer && (
                            <UserAvatar
                              name={reviewer.full_name}
                              avatarUrl={reviewer.avatar_url}
                              size="sm"
                              className="h-6 w-6 text-[10px] ring-0"
                            />
                          )}
                          <span className="text-sm font-medium text-slate-900">
                            {reviewer?.full_name ?? "Unknown"}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-semibold ${
                              approved
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            {approved ? td.approved : td.rejected}
                          </Badge>
                        </div>
                        {review.comment && (
                          <p className="pl-8 text-sm leading-relaxed text-slate-700">
                            &ldquo;{review.comment}&rdquo;
                          </p>
                        )}
                        <p className="pl-8 text-xs text-slate-400">
                          {format(new Date(review.reviewed_at), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SectionCard>
          )}
        </div>

        {/* ═════════════ RIGHT COLUMN (desktop) ═════════════ */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            {/* Actions */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {td.actions}
              </p>

              {canAct && (
                <PrimaryCTA
                  isOverdue={isOverdue}
                  isPending={isPending}
                  isInProgress={isInProgress}
                  isRejected={isRejected}
                  starting={starting}
                  resubmitting={resubmitting}
                  onStart={handleStartTask}
                  onComplete={() => setCompleteModalOpen(true)}
                  onResubmit={handleResubmit}
                />
              )}

              {isCompleted && (
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-bold text-emerald-900">{td.completed_label}</p>
                    <p className="text-xs text-emerald-700">
                      {td.awaiting_review}
                    </p>
                  </div>
                </div>
              )}

              {/* Secondary actions */}
              <div className="space-y-1 pt-1">
                {isInProgress && (
                  <SecondaryAction
                    icon={<Upload className="h-4 w-4" />}
                    label={td.upload_photos}
                    onClick={() => setCompleteModalOpen(true)}
                  />
                )}
                <SecondaryAction
                  icon={<MessageSquare className="h-4 w-4" />}
                  label="Add Comment"
                />
                <SecondaryAction
                  icon={<Flag className="h-4 w-4" />}
                  label="Report Issue"
                />
              </div>
            </div>

            {/* Details summary */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                {td.details}
              </p>
              <DetailRow
                label={td.priority}
                value={
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold ring-1 ${priorityChip[task.priority]}`}
                  >
                    <span
                      className={`h-1 w-1 rounded-full ${priorityDot[task.priority]}`}
                    />
                    {priorityLabel[task.priority]}
                  </span>
                }
              />
              <DetailRow
                label={td.status}
                value={
                  <span
                    className={`text-xs font-semibold ${
                      isOverdue || isRejected
                        ? "text-red-600"
                        : isCompleted
                          ? "text-emerald-700"
                          : isInProgress
                            ? "text-blue-700"
                            : "text-slate-700"
                    }`}
                  >
                    {statusBadge.label}
                  </span>
                }
              />
              <DetailRow
                label={td.due}
                value={
                  <span
                    className={`text-xs font-semibold ${isOverdue ? "text-red-600" : "text-slate-700"}`}
                  >
                    {format(new Date(task.due_date), "MMM d, h:mm a")}
                  </span>
                }
              />
              <DetailRow
                label={td.evidence}
                value={
                  <span className="text-xs font-semibold text-slate-700">
                    {td.evidence_count.replace("{count}", String(evidence.length))}
                  </span>
                }
              />
              <DetailRow
                label={td.reviews}
                value={
                  <span className="text-xs font-semibold text-slate-700">
                    {reviews.length}
                  </span>
                }
                last
              />
            </div>
          </div>
        </aside>
      </div>

      {/* ════════ MOBILE STICKY BOTTOM CTA ════════ */}
      {canAct && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.1)] backdrop-blur-xl lg:hidden">
          <div className="mx-auto max-w-lg">
            <PrimaryCTA
              isOverdue={isOverdue}
              isPending={isPending}
              isInProgress={isInProgress}
              isRejected={isRejected}
              starting={starting}
              resubmitting={resubmitting}
              onStart={handleStartTask}
              onComplete={() => setCompleteModalOpen(true)}
              onResubmit={handleResubmit}
            />
          </div>
        </div>
      )}

      <CompleteTaskModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        taskId={task.id}
        taskTitle={task.title}
        taskSiteLocation={task.site_location}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   HERO BANNER — Title + status chips + urgency
   ══════════════════════════════════════════════════ */

function HeroBanner({
  task,
  isOverdue,
  isCompleted,
  isRejected,
}: {
  task: Task;
  isOverdue: boolean;
  isCompleted: boolean;
  isRejected: boolean;
}) {
  const dict = useDictionary();
  const td = dict.staff.taskDetail;
  const wrapperCls = isOverdue
    ? "border-2 border-red-300 bg-gradient-to-br from-red-50 via-red-50 to-rose-100 shadow-red-100"
    : isCompleted
      ? "border border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50 to-teal-50"
      : isRejected
        ? "border-2 border-red-300 bg-gradient-to-br from-red-50 via-rose-50 to-pink-50"
        : "border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/40";

  const titleCls = isOverdue
    ? "text-red-900"
    : isCompleted
      ? "text-emerald-900"
      : isRejected
        ? "text-red-900"
        : "text-slate-900";

  return (
    <div className={`relative overflow-hidden rounded-2xl shadow-sm ${wrapperCls}`}>
      <div className="relative p-5 sm:p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${priorityChip[task.priority]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${priorityDot[task.priority]}`}
            />
            {dict.common.priority_label.replace("{priority}", dict.common.priority[task.priority])}
          </span>
          {isOverdue && (
            <span className="inline-flex animate-pulse items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
              <AlertTriangle className="h-3 w-3" />
              {dict.common.status.overdue}
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">
              <XCircle className="h-3 w-3" />
              {dict.common.status.rejected}
            </span>
          )}
          {isCompleted && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
              <CheckCircle2 className="h-3 w-3" />
              {dict.common.status.completed}
            </span>
          )}
        </div>

        <h1
          className={`text-2xl font-extrabold leading-tight tracking-tight sm:text-[28px] ${titleCls}`}
        >
          {task.title}
        </h1>

        {isOverdue && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-100 px-3 py-1.5 text-sm font-bold text-red-800">
            <Clock className="h-4 w-4" />
            {dict.common.time.overdue_by.replace("{time}", formatDistanceToNowStrict(new Date(task.due_date)))}
          </div>
        )}
        {isCompleted && task.completed_at && (
          <div className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            Completed {format(new Date(task.completed_at), "MMM d, yyyy 'at' h:mm a")}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ESCALATION CALLOUT — strong red urgency block
   ══════════════════════════════════════════════════ */

function EscalationCallout({ dueDate }: { dueDate: string }) {
  const dict = useDictionary();
  const td = dict.staff.taskDetail;
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border-2 border-red-300 bg-red-50 px-4 py-4 shadow-sm"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-500 text-white shadow-md">
        <Zap className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold leading-tight text-red-900">
          {td.escalation_title}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-red-700">
          {td.escalation_body.replace("{time}", formatDistanceToNowStrict(new Date(dueDate)))}
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PRIMARY CTA — large, color-changing main button
   Red when overdue, deep blue otherwise.
   ══════════════════════════════════════════════════ */

function PrimaryCTA({
  isOverdue,
  isPending,
  isInProgress,
  isRejected,
  starting,
  resubmitting,
  onStart,
  onComplete,
  onResubmit,
}: {
  isOverdue: boolean;
  isPending: boolean;
  isInProgress: boolean;
  isRejected: boolean;
  starting: boolean;
  resubmitting: boolean;
  onStart: () => void;
  onComplete: () => void;
  onResubmit: () => void;
}) {
  const dict = useDictionary();
  const td = dict.staff.taskDetail;
  const baseCls =
    "h-14 w-full rounded-2xl text-base font-bold shadow-lg transition active:scale-[0.98] flex items-center justify-center gap-2";

  if (isPending) {
    return (
      <Button
        onClick={onStart}
        disabled={starting}
        className={`${baseCls} ${
          isOverdue
            ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/30"
            : "bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-indigo-500/25"
        }`}
      >
        {starting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {td.starting}
          </>
        ) : (
          <>
            <Play className="h-5 w-5" fill="currentColor" />
            {isOverdue ? td.start_now : td.start_task}
          </>
        )}
      </Button>
    );
  }

  if (isInProgress) {
    return (
      <Button
        onClick={onComplete}
        className={`${baseCls} ${
          isOverdue
            ? "bg-red-600 hover:bg-red-700 text-white shadow-red-500/30"
            : "bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-indigo-500/25"
        }`}
      >
        <Camera className="h-5 w-5" />
        {td.submit_completion}
      </Button>
    );
  }

  if (isRejected) {
    return (
      <Button
        onClick={onResubmit}
        disabled={resubmitting}
        className={`${baseCls} bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30`}
      >
        {resubmitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            {td.reopening}
          </>
        ) : (
          <>
            <Play className="h-5 w-5" fill="currentColor" />
            {td.resubmit_task}
          </>
        )}
      </Button>
    );
  }

  return null;
}

/* ══════════════════════════════════════════════════
   TASK INFO CARD — Location / Due / Assignee cards
   ══════════════════════════════════════════════════ */

function TaskInfoCard({
  tone,
  icon,
  iconAsAvatar,
  label,
  value,
  danger,
}: {
  tone: "blue" | "violet" | "amber" | "slate";
  icon: React.ReactNode;
  iconAsAvatar?: boolean;
  label: string;
  value: string;
  danger?: boolean;
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    slate: "bg-slate-100 text-slate-500",
  };

  return (
    <div
      className={`rounded-2xl border bg-white p-4 transition hover:shadow-sm ${
        danger ? "border-red-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start gap-3">
        {iconAsAvatar ? (
          <div className="shrink-0">{icon}</div>
        ) : (
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}
          >
            {icon}
          </div>
        )}
        <div className="min-w-0 pt-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p
            className={`mt-0.5 truncate text-sm font-bold ${
              danger ? "text-red-700" : "text-slate-900"
            }`}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SECTION CARD
   ══════════════════════════════════════════════════ */

function SectionCard({
  title,
  icon,
  meta,
  compact,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  meta?: string;
  compact?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div
        className={`flex items-center gap-2 px-5 ${
          compact ? "border-b border-slate-100 py-3" : "pt-5 pb-2"
        }`}
      >
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50">
            {icon}
          </span>
        )}
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {title}
        </h2>
        {meta && (
          <span className="ml-auto text-xs font-medium text-slate-400">{meta}</span>
        )}
      </div>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   SIDE PANEL HELPERS
   ══════════════════════════════════════════════════ */

function SecondaryAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
    >
      <span className="text-slate-400">{icon}</span>
      {label}
    </button>
  );
}

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: React.ReactNode;
  last?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500">{label}</span>
        {value}
      </div>
      {!last && <div className="h-px bg-slate-100" />}
    </>
  );
}
