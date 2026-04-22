"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, isPast, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { startTask, resubmitTask } from "./actions";
import { CompleteTaskModal } from "@/components/staff/CompleteTaskModal";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import type {
  Task,
  Profile,
  TaskStatus,
  TaskEvidence,
  TaskReview,
} from "@/lib/types";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/types";

interface TaskDetailClientProps {
  task: Task;
  creator: Profile | null;
  evidence: TaskEvidence[];
  reviews: (Omit<TaskReview, "reviewed_by"> & {
    reviewed_by: Profile | null;
  })[];
}

const priorityStyles: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  low: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
  },
  medium: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  high: { bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
  critical: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};

const statusStyles: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  pending: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    ring: "ring-slate-200",
  },
  in_progress: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
  },
  completed: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  rejected: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200" },
  overdue: { bg: "bg-red-50", text: "text-red-700", ring: "ring-red-200" },
};

export function TaskDetailClient({
  task,
  creator,
  evidence,
  reviews,
}: TaskDetailClientProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [resubmitting, setResubmitting] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);

  const isOverdue =
    (task.status === "pending" || task.status === "in_progress") &&
    isPast(new Date(task.due_date));

  const displayStatus: TaskStatus = isOverdue ? "overdue" : task.status;
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const statusCfg = STATUS_CONFIG[displayStatus];
  const pStyle = priorityStyles[task.priority];
  const sStyle = statusStyles[displayStatus];

  const canAct =
    task.status === "pending" ||
    task.status === "in_progress" ||
    task.status === "rejected";

  async function handleStartTask() {
    setStarting(true);
    const result = await startTask(task.id);
    if (result.error) {
      toast.error(result.error);
      setStarting(false);
      return;
    }
    toast.success("Task started!");
    router.refresh();
    setStarting(false);
  }

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-6 lg:px-8 pb-32 lg:pb-8">
      {/* Breadcrumb navigation */}
      <div className="flex items-center justify-between py-5">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-700 transition-colors min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-slate-300">/</span>
          <button
            onClick={() => router.push("/staff/tasks")}
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            Operations
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-400">Tasks</span>
          <span className="text-slate-300">/</span>
          <span className="text-slate-700 font-medium truncate max-w-[200px]">
            {task.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ring-1 ring-inset ${sStyle.bg} ${sStyle.text} ${sStyle.ring}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${isOverdue ? "animate-pulse" : ""} ${
                displayStatus === "overdue"
                  ? "bg-red-500"
                  : displayStatus === "completed"
                    ? "bg-emerald-500"
                    : displayStatus === "in_progress"
                      ? "bg-blue-500"
                      : displayStatus === "rejected"
                        ? "bg-red-500"
                        : "bg-slate-400"
              }`}
            />
            {statusCfg.label}
          </div>
        </div>
      </div>

      {/* Main layout: content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left column */}
        <div className="space-y-6 min-w-0">
          {/* Hero section — premium alert card */}
          <div
            className={`relative overflow-hidden rounded-2xl border ${
              isOverdue
                ? "border-red-200 bg-gradient-to-br from-red-50 via-red-50/80 to-orange-50"
                : task.status === "completed"
                  ? "border-emerald-200 bg-gradient-to-br from-emerald-50 via-emerald-50/80 to-teal-50"
                  : task.status === "rejected"
                    ? "border-red-200 bg-gradient-to-br from-red-50 via-rose-50/80 to-pink-50"
                    : "border-slate-200 bg-gradient-to-br from-slate-50 via-white to-indigo-50/30"
            }`}
          >
            {/* Subtle glow */}
            <div
              className={`absolute -top-20 -right-20 w-60 h-60 rounded-full blur-3xl opacity-20 ${
                isOverdue
                  ? "bg-red-300"
                  : task.status === "completed"
                    ? "bg-emerald-300"
                    : "bg-indigo-300"
              }`}
            />
            <div className="relative p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${pStyle.bg} ${pStyle.text}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${pStyle.dot}`}
                  />
                  {priorityCfg.label} Priority
                </span>
                {isOverdue && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700 task-pulse-badge">
                    <AlertTriangle className="h-3 w-3" />
                    Overdue
                  </span>
                )}
                {task.status === "rejected" && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                    <XCircle className="h-3 w-3" />
                    Rejected
                  </span>
                )}
              </div>
              <h1
                className={`text-xl sm:text-2xl font-bold leading-tight tracking-tight ${
                  isOverdue
                    ? "text-red-900"
                    : task.status === "completed"
                      ? "text-emerald-900"
                      : "text-slate-900"
                }`}
              >
                {task.title}
              </h1>
              {isOverdue && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-600 font-medium">
                  <Clock className="h-4 w-4" />
                  Overdue by {formatDistanceToNow(new Date(task.due_date))}
                </div>
              )}
              {task.status === "completed" && task.completed_at && (
                <div className="mt-3 flex items-center gap-2 text-sm text-emerald-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Completed{" "}
                  {format(
                    new Date(task.completed_at),
                    "MMM d, yyyy 'at' h:mm a"
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Description card */}
          {task.description && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Description
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {task.description}
              </p>
            </div>
          )}

          {/* Metadata grid — 2x2 */}
          <div className="grid grid-cols-2 gap-3">
            {task.site_location && (
              <div className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5">
                <div className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <MapPin className="h-[18px] w-[18px]" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Location
                    </p>
                    <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                      {task.site_location}
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <CalendarDays className="h-[18px] w-[18px]" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Due Date
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {format(new Date(task.due_date), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            </div>
            <div className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5">
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                  <Clock className="h-[18px] w-[18px]" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Due Time
                  </p>
                  <p className="text-sm font-semibold text-slate-900 mt-0.5">
                    {format(new Date(task.due_date), "h:mm a")}
                  </p>
                </div>
              </div>
            </div>
            <div className="group rounded-2xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5">
              <div className="flex items-start gap-3.5">
                {creator ? (
                  <UserAvatar
                    name={creator.full_name}
                    avatarUrl={creator.avatar_url}
                    size="sm"
                    className="ring-0 h-10 w-10"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <User className="h-[18px] w-[18px]" />
                  </div>
                )}
                <div className="min-w-0 pt-0.5">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    Assigned By
                  </p>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {creator?.full_name ?? "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Evidence section */}
          {evidence.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                  <FileImage className="h-3.5 w-3.5 text-indigo-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Evidence
                </h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">
                  {evidence.length}{" "}
                  {evidence.length === 1 ? "submission" : "submissions"}
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {evidence.map((ev) => (
                  <div key={ev.id} className="p-5 space-y-3">
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <img
                        src={ev.photo_url}
                        alt="Task evidence"
                        className="w-full h-auto max-h-72 object-cover"
                      />
                    </div>
                    {ev.notes && (
                      <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3.5">
                        <MessageSquare className="h-4 w-4 mt-0.5 text-slate-400 shrink-0" />
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {ev.notes}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-slate-400">
                      {format(
                        new Date(ev.submitted_at),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity timeline (reviews) */}
          {reviews.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Activity
                </h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">
                  {reviews.length}{" "}
                  {reviews.length === 1 ? "review" : "reviews"}
                </span>
              </div>
              <div className="p-5">
                <div className="relative pl-6 space-y-6">
                  {/* Timeline line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                  {reviews.map((review) => {
                    const reviewer = review.reviewed_by;
                    const isApproved = review.action === "approved";
                    return (
                      <div key={review.id} className="relative">
                        {/* Timeline dot */}
                        <div
                          className={`absolute -left-6 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full ring-4 ring-white ${
                            isApproved ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            {reviewer && (
                              <UserAvatar
                                name={reviewer.full_name}
                                avatarUrl={reviewer.avatar_url}
                                size="sm"
                                className="ring-0 h-6 w-6 text-[10px]"
                              />
                            )}
                            <span className="text-sm font-medium text-slate-900">
                              {reviewer?.full_name ?? "Unknown"}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] font-semibold ${
                                isApproved
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-700"
                              }`}
                            >
                              {isApproved ? "Approved" : "Rejected"}
                            </Badge>
                          </div>
                          {review.comment && (
                            <p className="text-sm text-slate-600 leading-relaxed pl-8">
                              &ldquo;{review.comment}&rdquo;
                            </p>
                          )}
                          <p className="text-xs text-slate-400 pl-8">
                            {format(
                              new Date(review.reviewed_at),
                              "MMM d, yyyy 'at' h:mm a"
                            )}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column — sticky action panel (desktop) */}
        <div className="hidden lg:block">
          <div className="sticky top-6 space-y-4">
            {/* Actions card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Actions
              </p>

              {/* Primary CTA */}
              {task.status === "pending" && (
                <Button
                  onClick={handleStartTask}
                  disabled={starting}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  {starting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Starting…
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Task
                    </>
                  )}
                </Button>
              )}
              {task.status === "in_progress" && (
                <Button
                  onClick={() => setCompleteModalOpen(true)}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Submit Completion
                </Button>
              )}
              {task.status === "rejected" && (
                <Button
                  onClick={async () => {
                    setResubmitting(true);
                    const result = await resubmitTask(task.id);
                    if (result.error) {
                      toast.error(result.error);
                      setResubmitting(false);
                      return;
                    }
                    toast.success("Task reopened — submit new evidence");
                    router.refresh();
                    setResubmitting(false);
                  }}
                  disabled={resubmitting}
                  className="w-full h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  {resubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Reopening…
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Resubmit Task
                    </>
                  )}
                </Button>
              )}
              {task.status === "completed" && (
                <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      Completed
                    </p>
                    <p className="text-xs text-emerald-600">Awaiting review</p>
                  </div>
                </div>
              )}

              {/* Secondary actions */}
              {canAct && (
                <div className="space-y-1 pt-1">
                  {task.status === "in_progress" && (
                    <button
                      onClick={() => setCompleteModalOpen(true)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                    >
                      <Upload className="h-4 w-4 text-slate-400" />
                      Upload Photos
                    </button>
                  )}
                  <button className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <MessageSquare className="h-4 w-4 text-slate-400" />
                    Add Comment
                  </button>
                  <button className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors">
                    <Flag className="h-4 w-4 text-slate-400" />
                    Report Issue
                  </button>
                </div>
              )}
            </div>

            {/* Details summary card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Details
              </p>
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Priority</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium ${pStyle.text}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${pStyle.dot}`}
                    />
                    {priorityCfg.label}
                  </span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Status</span>
                  <span className={`text-xs font-medium ${sStyle.text}`}>
                    {statusCfg.label}
                  </span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Due</span>
                  <span className="text-xs font-medium text-slate-700">
                    {format(new Date(task.due_date), "MMM d, h:mm a")}
                  </span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Evidence</span>
                  <span className="text-xs font-medium text-slate-700">
                    {evidence.length} uploaded
                  </span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Reviews</span>
                  <span className="text-xs font-medium text-slate-700">
                    {reviews.length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom action bar */}
      {canAct && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-lg px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            {task.status === "pending" && (
              <Button
                onClick={handleStartTask}
                disabled={starting}
                className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all duration-200"
              >
                {starting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Task
                  </>
                )}
              </Button>
            )}
            {task.status === "in_progress" && (
              <Button
                onClick={() => setCompleteModalOpen(true)}
                className="flex-1 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition-all duration-200"
              >
                <Camera className="mr-2 h-4 w-4" />
                Submit Completion
              </Button>
            )}
            {task.status === "rejected" && (
              <Button
                onClick={async () => {
                  setResubmitting(true);
                  const result = await resubmitTask(task.id);
                  if (result.error) {
                    toast.error(result.error);
                    setResubmitting(false);
                    return;
                  }
                  toast.success("Task reopened — submit new evidence");
                  router.refresh();
                  setResubmitting(false);
                }}
                disabled={resubmitting}
                className="flex-1 h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm transition-all duration-200"
              >
                {resubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reopening…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Resubmit
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Complete task modal */}
      <CompleteTaskModal
        open={completeModalOpen}
        onOpenChange={setCompleteModalOpen}
        taskId={task.id}
        taskTitle={task.title}
      />
    </div>
  );
}
