"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { toast } from "sonner";
import {
  approveTask,
  rejectTask,
  escalateTask,
} from "./actions";
import { ApproveModal } from "@/components/supervisor/ApproveModal";
import { RejectModal } from "@/components/supervisor/RejectModal";
import { EscalateModal } from "@/components/supervisor/EscalateModal";
import { UserAvatar } from "@/components/ui/user-avatar";
import {
  MapPin,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Maximize2,
  ChevronRight,
  FileText,
  ImageIcon,
  X,
  User,
  AlertOctagon,
  Flame,
  Mail,
  ShieldAlert,
  MessageCircle,
  Sparkles,
  Camera,
  CalendarClock,
  CheckCheck,
} from "lucide-react";
import type { TaskPriority, TaskStatus, Profile } from "@/lib/types";

/* ─────────────────────────────────
   Design tokens
   Primary  : #1E3A8A
   Approve  : #22C55E
   Reject   : #EF4444
   ───────────────────────────────── */

interface TaskWithProfile {
  id: string;
  title: string;
  description: string | null;
  site_location: string | null;
  due_date: string;
  priority: TaskPriority;
  status: TaskStatus;
  created_at: string;
  assigned_to_profile: Profile | Profile[];
}

interface EvidenceData {
  id: string;
  photo_url: string;
  notes: string | null;
  submitted_at: string;
  submitter: Profile | Profile[];
}

interface ReviewDetailClientProps {
  task: TaskWithProfile;
  evidence: EvidenceData | null;
  managerId: string | null;
}

function unwrap<T>(val: T | T[]): T {
  return Array.isArray(val) ? val[0] : val;
}

/* ── Theme maps ── */

const PRIORITY_THEME: Record<
  TaskPriority,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    icon: typeof Flame | null;
  }
> = {
  low: { label: "Low", badgeBg: "bg-emerald-500", badgeText: "text-white", icon: null },
  medium: { label: "Medium", badgeBg: "bg-yellow-300", badgeText: "text-yellow-900", icon: null },
  high: { label: "High", badgeBg: "bg-orange-500", badgeText: "text-white", icon: Flame },
  critical: { label: "Critical", badgeBg: "bg-red-500", badgeText: "text-white", icon: AlertOctagon },
};

const STATUS_THEME: Record<
  TaskStatus,
  { label: string; badgeBg: string; badgeText: string }
> = {
  pending: { label: "Pending", badgeBg: "bg-slate-200", badgeText: "text-slate-700" },
  in_progress: { label: "In Progress", badgeBg: "bg-blue-100", badgeText: "text-blue-700" },
  completed: { label: "Completed", badgeBg: "bg-emerald-500", badgeText: "text-white" },
  rejected: { label: "Rejected", badgeBg: "bg-red-500", badgeText: "text-white" },
  overdue: { label: "Overdue", badgeBg: "bg-red-500", badgeText: "text-white" },
};

/* ══════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════ */

export function ReviewDetailClient({
  task,
  evidence,
  managerId,
}: ReviewDetailClientProps) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [resubmitOpen, setResubmitOpen] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(false);

  /* Defer time-based formatting to client to avoid SSR hydration drift */
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const staff = unwrap(task.assigned_to_profile);
  const submitter = evidence ? unwrap(evidence.submitter) : null;

  const dueDate = new Date(task.due_date);
  const isReadyForApproval = !!evidence && task.status === "completed";

  /* ── Handlers ── */
  async function handleApprove(comment?: string) {
    const result = await approveTask(task.id, comment);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Task approved successfully!");
    setApproveOpen(false);
    router.push("/supervisor/reviews");
  }

  async function handleReject(reason: string) {
    const result = await rejectTask(task.id, reason);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Task rejected. Staff has been notified.");
    setRejectOpen(false);
    router.push("/supervisor/reviews");
  }

  async function handleResubmit(reason: string) {
    /* Reuse rejectTask with a clarifying prefix to request resubmission */
    const finalReason = `Resubmission requested: ${reason}`;
    const result = await rejectTask(task.id, finalReason);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Resubmission requested. Staff has been notified.");
    setResubmitOpen(false);
    router.push("/supervisor/reviews");
  }

  async function handleEscalate(reason: string) {
    if (!managerId) {
      toast.error("No manager available for escalation");
      return;
    }
    const result = await escalateTask(task.id, reason, managerId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Task escalated to manager.");
    setEscalateOpen(false);
    router.push("/supervisor/reviews");
  }

  return (
    <div className="min-h-screen bg-slate-50/60">
      <div className="mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* ────── Breadcrumb ────── */}
        <nav className="mb-5 flex items-center gap-1.5 text-[12px] font-medium">
          <Link
            href="/supervisor/dashboard"
            className="text-slate-400 transition hover:text-slate-700"
          >
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <Link
            href="/supervisor/reviews"
            className="text-slate-400 transition hover:text-slate-700"
          >
            Pending Reviews
          </Link>
          <ChevronRight className="h-3 w-3 text-slate-300" />
          <span className="max-w-[220px] truncate font-semibold text-slate-700">
            {task.title}
          </span>
        </nav>

        {/* ────── Header ────── */}
        <header className="mb-6 space-y-3">
          {/* Badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
            {mounted && isPast(dueDate) && task.status !== "completed" && (
              <span
                className="inline-flex items-center gap-1 rounded-md bg-red-100 px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider text-red-700 ring-1 ring-red-200"
                suppressHydrationWarning
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                Overdue
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            {task.title}
          </h1>

          {/* Subtitle */}
          <p className="text-[13.5px] text-slate-500" suppressHydrationWarning>
            {mounted ? (
              <>
                Submitted{" "}
                {evidence
                  ? formatDistanceToNow(new Date(evidence.submitted_at), {
                      addSuffix: true,
                    })
                  : "—"}{" "}
                · Awaiting your approval
              </>
            ) : (
              <>Awaiting your approval</>
            )}
          </p>
        </header>

        {/* ────── Readiness banner ────── */}
        <ReadinessBanner ready={isReadyForApproval} hasEvidence={!!evidence} />

        {/* ────── Main grid ────── */}
        <div className="mt-6 grid gap-5 lg:grid-cols-3 lg:gap-6">
          {/* LEFT (2/3): evidence + task info */}
          <div className="space-y-5 lg:col-span-2">
            {/* Evidence — most important */}
            <EvidenceSection
              evidence={evidence}
              submitter={submitter}
              mounted={mounted}
              onZoom={() => setPhotoZoom(true)}
              onRequestResubmit={() => setResubmitOpen(true)}
            />

            {/* Task info */}
            <TaskInfoCard task={task} />
          </div>

          {/* RIGHT (1/3): staff + timeline */}
          <aside className="space-y-5">
            <StaffCard staff={staff} />
            <TimelineCard
              task={task}
              evidence={evidence}
              submitterName={submitter?.full_name}
            />
          </aside>
        </div>
      </div>

      {/* ════════ DECISION DOCK (sticky) ════════ */}
      <DecisionDock
        ready={isReadyForApproval}
        onApprove={() => setApproveOpen(true)}
        onReject={() => setRejectOpen(true)}
        onResubmit={() => setResubmitOpen(true)}
        onEscalate={() => setEscalateOpen(true)}
      />

      {/* ════════ Modals ════════ */}
      <ApproveModal
        open={approveOpen}
        onOpenChange={setApproveOpen}
        onConfirm={handleApprove}
      />
      <RejectModal
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
      />
      <RejectModal
        open={resubmitOpen}
        onOpenChange={setResubmitOpen}
        onConfirm={handleResubmit}
      />
      <EscalateModal
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        onConfirm={handleEscalate}
      />

      {/* ════════ Photo Zoom Overlay ════════ */}
      {photoZoom && evidence && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setPhotoZoom(false)}
          role="dialog"
          aria-label="Evidence photo full view"
        >
          <button
            onClick={() => setPhotoZoom(false)}
            aria-label="Close"
            className="absolute top-5 right-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/95 text-slate-700 shadow-lg transition hover:bg-white"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={evidence.photo_url}
            alt="Task evidence full view"
            className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   READINESS BANNER
   Tells the supervisor in 1 second: can I approve now?
   ══════════════════════════════════════════════════ */

function ReadinessBanner({
  ready,
  hasEvidence,
}: {
  ready: boolean;
  hasEvidence: boolean;
}) {
  if (ready) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/60 p-4 shadow-sm">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/30">
          <CheckCheck className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[13.5px] font-extrabold text-emerald-800">
            Ready for your approval
          </p>
          <p className="text-[12px] text-emerald-700/80">
            Evidence submitted. Review below and approve or reject.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 via-white to-orange-50/60 p-4 shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
        <ShieldAlert className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[13.5px] font-extrabold text-amber-900">
          {hasEvidence ? "Review with caution" : "Evidence missing"}
        </p>
        <p className="text-[12px] text-amber-800/80">
          {hasEvidence
            ? "Task is not yet marked completed. Verify before approving."
            : "Staff has not uploaded a photo. Request resubmission or escalate."}
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   EVIDENCE SECTION
   ══════════════════════════════════════════════════ */

function EvidenceSection({
  evidence,
  submitter,
  mounted,
  onZoom,
  onRequestResubmit,
}: {
  evidence: EvidenceData | null;
  submitter: Profile | null;
  mounted: boolean;
  onZoom: () => void;
  onRequestResubmit: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] to-indigo-500 shadow-sm">
            <ImageIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
              Submitted Evidence
            </h2>
            {evidence && submitter && (
              <p
                className="mt-0.5 text-[11.5px] text-slate-500"
                suppressHydrationWarning
              >
                {mounted
                  ? `${submitter.full_name} · ${formatDistanceToNow(
                      new Date(evidence.submitted_at),
                      { addSuffix: true },
                    )}`
                  : submitter.full_name}
              </p>
            )}
          </div>
        </div>
        {evidence && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wider text-emerald-700">
            <Camera className="h-3 w-3" />1 photo
          </span>
        )}
      </div>

      {evidence ? (
        <div className="space-y-4 p-5">
          {/* Photo */}
          <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={evidence.photo_url}
              alt="Task evidence"
              onClick={onZoom}
              className="w-full max-h-[560px] cursor-zoom-in object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />
            <button
              onClick={onZoom}
              className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-xl bg-white/95 px-3.5 py-2 text-[12px] font-bold text-slate-700 shadow-lg backdrop-blur-md transition hover:bg-white"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              Fullscreen
            </button>
          </div>

          {/* Staff notes */}
          {evidence.notes && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-slate-400" />
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
                  Staff notes
                </p>
              </div>
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700">
                {evidence.notes}
              </p>
            </div>
          )}

          {/* Request additional evidence */}
          <button
            type="button"
            onClick={onRequestResubmit}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[12px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            Request additional evidence
          </button>
        </div>
      ) : (
        <NoEvidencePlaceholder onRequestResubmit={onRequestResubmit} />
      )}
    </section>
  );
}

function NoEvidencePlaceholder({
  onRequestResubmit,
}: {
  onRequestResubmit: () => void;
}) {
  return (
    <div className="p-5">
      <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 p-8 sm:p-10">
        <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="relative flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
            <Camera className="h-7 w-7" />
          </div>
          <h3 className="text-base font-extrabold text-amber-900">
            No evidence submitted yet
          </h3>
          <p className="mt-1 max-w-sm text-[13px] text-amber-800/80">
            Photos are required for compliance on most tasks. You can request
            the staff member to upload evidence or escalate this task.
          </p>
          <button
            type="button"
            onClick={onRequestResubmit}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-5 py-3 text-[13px] font-bold text-white shadow-md shadow-amber-500/30 transition hover:bg-amber-600 min-h-[44px]"
          >
            <MessageCircle className="h-4 w-4" />
            Request evidence
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TASK INFO CARD
   ══════════════════════════════════════════════════ */

function TaskInfoCard({ task }: { task: TaskWithProfile }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
          Task Information
        </h2>
      </div>

      <div className="space-y-4 p-5">
        {task.description && (
          <div>
            <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
              Description
            </p>
            <p className="whitespace-pre-line text-[13.5px] leading-relaxed text-slate-700">
              {task.description}
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {task.site_location && (
            <InfoRow
              icon={<MapPin className="h-4 w-4" />}
              iconBg="bg-blue-50 text-blue-600"
              label="Location"
              value={task.site_location}
            />
          )}
          <InfoRow
            icon={<CalendarDays className="h-4 w-4" />}
            iconBg="bg-amber-50 text-amber-600"
            label="Due date"
            value={format(new Date(task.due_date), "MMM d, yyyy · h:mm a")}
          />
        </div>
      </div>
    </section>
  );
}

function InfoRow({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/40 p-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="mt-0.5 truncate text-[13px] font-semibold text-slate-800">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   STAFF CARD
   ══════════════════════════════════════════════════ */

function StaffCard({ staff }: { staff: Profile | null }) {
  if (!staff) return null;
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
            Assigned Staff
          </h2>
        </div>
      </div>
      <div className="flex items-center gap-3 p-5">
        <UserAvatar
          name={staff.full_name}
          avatarUrl={staff.avatar_url}
          size="lg"
          className="h-14 w-14 shrink-0 ring-2 ring-white shadow-md"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-extrabold text-slate-900">
            {staff.full_name}
          </p>
          {staff.role && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
              {staff.role}
            </span>
          )}
          {staff.email && (
            <p className="mt-2 inline-flex items-center gap-1.5 truncate text-[12px] text-slate-500">
              <Mail className="h-3 w-3" />
              {staff.email}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   TIMELINE CARD
   ══════════════════════════════════════════════════ */

function TimelineCard({
  task,
  evidence,
  submitterName,
}: {
  task: TaskWithProfile;
  evidence: EvidenceData | null;
  submitterName?: string;
}) {
  const events: {
    icon: React.ReactNode;
    iconBg: string;
    title: React.ReactNode;
    time: string;
    active?: boolean;
  }[] = [
    {
      icon: <Sparkles className="h-3.5 w-3.5" />,
      iconBg: "bg-slate-300 text-white",
      title: "Task created",
      time: format(new Date(task.created_at), "MMM d · h:mm a"),
    },
    {
      icon: <CalendarClock className="h-3.5 w-3.5" />,
      iconBg: "bg-amber-500 text-white",
      title: "Due date",
      time: format(new Date(task.due_date), "MMM d · h:mm a"),
    },
  ];

  if (evidence) {
    events.push({
      icon: <Camera className="h-3.5 w-3.5" />,
      iconBg: "bg-blue-500 text-white",
      title: (
        <>
          Evidence submitted
          {submitterName && (
            <span className="font-semibold text-slate-800"> by {submitterName}</span>
          )}
        </>
      ),
      time: format(new Date(evidence.submitted_at), "MMM d · h:mm a"),
    });
  }

  events.push({
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    iconBg: "bg-emerald-500 text-white",
    title: "Awaiting your review",
    time: "now",
    active: true,
  });

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <h2 className="text-[14px] font-extrabold tracking-tight text-slate-900">
            Timeline
          </h2>
        </div>
      </div>
      <div className="p-5">
        <ol className="relative space-y-4">
          {/* Vertical connector */}
          <span
            className="absolute left-[15px] top-3 bottom-3 w-px bg-slate-200"
            aria-hidden
          />
          {events.map((e, idx) => (
            <li key={idx} className="relative flex items-start gap-3">
              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${e.iconBg} shadow-sm ring-4 ring-white ${
                  e.active ? "animate-pulse" : ""
                }`}
              >
                {e.icon}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <p
                  className={`text-[12.5px] ${
                    e.active
                      ? "font-extrabold text-emerald-700"
                      : "font-semibold text-slate-700"
                  }`}
                >
                  {e.title}
                </p>
                <p className="text-[11px] text-slate-400">{e.time}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════
   STATUS / PRIORITY BADGES
   ══════════════════════════════════════════════════ */

function StatusBadge({ status }: { status: TaskStatus }) {
  const theme = STATUS_THEME[status];
  const Icon =
    status === "completed"
      ? CheckCircle2
      : status === "rejected"
        ? XCircle
        : AlertOctagon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider shadow-sm ${theme.badgeBg} ${theme.badgeText}`}
    >
      <Icon className="h-3 w-3" />
      {theme.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const theme = PRIORITY_THEME[priority];
  const Icon = theme.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider shadow-sm ${theme.badgeBg} ${theme.badgeText}`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {theme.label}
    </span>
  );
}

/* ══════════════════════════════════════════════════
   DECISION DOCK — sticky bottom action bar
   ══════════════════════════════════════════════════ */

function DecisionDock({
  ready,
  onApprove,
  onReject,
  onResubmit,
  onEscalate,
}: {
  ready: boolean;
  onApprove: () => void;
  onReject: () => void;
  onResubmit: () => void;
  onEscalate: () => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 lg:pl-[260px]">
      {/* Top fade */}
      <div className="pointer-events-none h-8 bg-gradient-to-t from-slate-50 to-transparent" />

      <div className="border-t border-slate-200 bg-white/95 backdrop-blur-xl shadow-[0_-6px_32px_rgba(15,23,42,0.08)]">
        <div
          className="mx-auto max-w-5xl px-4 py-3 sm:px-6 lg:px-8"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {/* Status hint */}
          <div className="mb-2 flex items-center justify-between gap-2 sm:hidden">
            <p
              className={`text-[10.5px] font-bold uppercase tracking-wider ${
                ready ? "text-emerald-700" : "text-amber-700"
              }`}
            >
              {ready ? "Ready for decision" : "Review with caution"}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* Secondary actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onEscalate}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[12px] font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 min-h-[44px]"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Escalate</span>
              </button>
              <button
                type="button"
                onClick={onResubmit}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] font-bold text-amber-800 shadow-sm transition hover:bg-amber-100 min-h-[44px] sm:flex-none"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Request resubmission</span>
                <span className="sm:hidden">Resubmit</span>
              </button>
            </div>

            {/* Primary actions */}
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <button
                type="button"
                onClick={onReject}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-red-600 px-5 py-3 text-[13px] font-bold text-white shadow-md shadow-red-600/30 transition hover:bg-red-700 active:scale-[0.98] min-h-[48px]"
              >
                <XCircle className="h-4 w-4" />
                Reject
              </button>
              <button
                type="button"
                onClick={onApprove}
                className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 px-6 py-3 text-[13px] font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-600 active:scale-[0.98] min-h-[48px]"
              >
                <CheckCircle2 className="h-4 w-4" />
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
