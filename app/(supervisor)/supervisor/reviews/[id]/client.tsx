"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format, formatDistanceToNow } from "date-fns";
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
  Hash,
  User,
} from "lucide-react";
import type { TaskPriority, TaskStatus, Profile } from "@/lib/types";

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

const PRIORITY_THEME: Record<TaskPriority, { label: string; dot: string; text: string; bg: string; border: string }> = {
  low: { label: "Low", dot: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200" },
  medium: { label: "Medium", dot: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  high: { label: "High", dot: "bg-orange-500", text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  critical: { label: "Critical", dot: "bg-red-500", text: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
};

const STATUS_THEME: Record<TaskStatus, { label: string; bg: string; text: string; border: string }> = {
  pending: { label: "Pending", bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200" },
  in_progress: { label: "In Progress", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  completed: { label: "Completed", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  overdue: { label: "Overdue", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

export function ReviewDetailClient({
  task,
  evidence,
  managerId,
}: ReviewDetailClientProps) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [photoZoom, setPhotoZoom] = useState(false);

  const staff = unwrap(task.assigned_to_profile);
  const submitter = evidence ? unwrap(evidence.submitter) : null;
  const priority = PRIORITY_THEME[task.priority];
  const status = STATUS_THEME[task.status];

  async function handleApprove(comment?: string) {
    const result = await approveTask(task.id, comment);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Task approved successfully!");
    setApproveOpen(false);
    router.push("/supervisor/dashboard");
  }

  async function handleReject(reason: string) {
    const result = await rejectTask(task.id, reason);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Task rejected. Staff has been notified.");
    setRejectOpen(false);
    router.push("/supervisor/dashboard");
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
    router.push("/supervisor/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <div className="mx-auto max-w-4xl px-4 pb-28 pt-8 sm:px-6 lg:px-8">

        {/* ── Breadcrumb ── */}
        <nav className="mb-8 flex items-center gap-2 text-[12px]">
          <Link
            href="/supervisor/dashboard"
            className="text-gray-400 transition-colors hover:text-gray-700"
          >
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <Link
            href="/supervisor/reviews"
            className="text-gray-400 transition-colors hover:text-gray-700"
          >
            Reviews
          </Link>
          <ChevronRight className="h-3 w-3 text-gray-300" />
          <span className="text-gray-600 truncate max-w-[220px] font-medium">
            {task.title}
          </span>
        </nav>

        {/* ── Header: Status + Title ── */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full border ${status.border} ${status.bg} px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] ${status.text}`}>
              {status.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full border ${priority.border} ${priority.bg} px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em]`}>
              <span className={`h-1.5 w-1.5 rounded-full ${priority.dot}`} />
              <span className={priority.text}>{priority.label}</span>
            </span>
            <span className="ml-auto hidden text-[11px] text-gray-400 sm:flex items-center gap-1">
              <Hash className="h-3 w-3" />
              {task.id.slice(0, 8)}
            </span>
          </div>

          <h1 className="text-[26px] font-bold leading-tight tracking-tight text-gray-900 sm:text-[30px]">
            {task.title}
          </h1>

          {task.description && (
            <p className="max-w-2xl text-[14px] leading-[1.7] text-gray-500">
              {task.description}
            </p>
          )}
        </div>

        {/* ── Metadata Cards Row ── */}
        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Location */}
          {task.site_location && (
            <div className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                  <MapPin className="h-3.5 w-3.5 text-gray-400" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                  Location
                </p>
              </div>
              <p className="text-[13px] font-medium text-gray-800 pl-9">
                {task.site_location}
              </p>
            </div>
          )}

          {/* Due Date */}
          <div className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                <CalendarDays className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                Due Date
              </p>
            </div>
            <p className="text-[13px] font-medium text-gray-800 pl-9">
              {format(new Date(task.due_date), "MMM d, yyyy · h:mm a")}
            </p>
          </div>

          {/* Assignee */}
          <div className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
                <User className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                Assigned To
              </p>
            </div>
            <div className="flex items-center gap-2.5 pl-9">
              <UserAvatar
                name={staff?.full_name || "?"}
                avatarUrl={staff?.avatar_url}
                size="sm"
                className="!h-6 !w-6 !text-[10px] ring-1 ring-gray-200"
              />
              <div>
                <p className="text-[13px] font-medium text-gray-800">
                  {staff?.full_name || "Unknown"}
                </p>
                {staff?.email && (
                  <p className="text-[11px] text-gray-400">{staff.email}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Evidence Section ── */}
        <div className="review-evidence-enter mb-8">
          {/* Section label */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
              </div>
              <h2 className="text-[14px] font-semibold tracking-tight text-gray-900">
                Submitted Evidence
              </h2>
            </div>
            {evidence && submitter && (
              <div className="hidden items-center gap-2 text-[11px] text-gray-400 sm:flex">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(evidence.submitted_at), { addSuffix: true })}
                <span className="text-gray-300">·</span>
                <span className="text-gray-500">{submitter.full_name}</span>
              </div>
            )}
          </div>

          {evidence ? (
            <div className="space-y-4">
              {/* Mobile timestamp */}
              {submitter && (
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400 sm:hidden">
                  <Clock className="h-3 w-3" />
                  {format(new Date(evidence.submitted_at), "MMM d, yyyy · h:mm a")}
                  <span className="text-gray-300">·</span>
                  <span className="text-gray-500">{submitter.full_name}</span>
                </div>
              )}

              {/* Photo container */}
              <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <img
                  src={evidence.photo_url}
                  alt="Task evidence"
                  className="w-full max-h-[520px] object-cover cursor-pointer transition-all duration-700 group-hover:scale-[1.015]"
                  onClick={() => setPhotoZoom(true)}
                />
                {/* Bottom gradient */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/30 to-transparent" />
                {/* Fullscreen button */}
                <button
                  onClick={() => setPhotoZoom(true)}
                  className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-xl bg-white/90 px-3.5 py-2 text-[11px] font-semibold text-gray-700 shadow-lg backdrop-blur-md transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-white"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  Fullscreen
                </button>
              </div>

              {/* Staff Notes */}
              {evidence.notes && (
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gray-100">
                      <FileText className="h-3 w-3 text-gray-400" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400">
                      Staff Notes
                    </p>
                  </div>
                  <p className="text-[13px] leading-[1.7] text-gray-600 pl-8">
                    {evidence.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white p-14 shadow-sm">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                <ImageIcon className="h-5 w-5 text-gray-300" />
              </div>
              <p className="text-[13px] font-medium text-gray-500">
                No evidence submitted yet
              </p>
              <p className="mt-1 text-[11px] text-gray-400">
                Staff has not uploaded photos or notes for this task.
              </p>
            </div>
          )}
        </div>

        {/* ── Review Timeline / Audit ── */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <h2 className="text-[14px] font-semibold tracking-tight text-gray-900">
              Timeline
            </h2>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="relative space-y-5 pl-3">
              {/* Vertical line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-200" />

              {/* Created */}
              <div className="relative flex items-start gap-4">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-gray-300 ring-2 ring-white" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-600">Task created</p>
                  <p className="text-[11px] text-gray-400">
                    {format(new Date(task.created_at), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              </div>

              {/* Due */}
              <div className="relative flex items-start gap-4">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white" />
                </div>
                <div>
                  <p className="text-[12px] font-medium text-gray-600">Due date</p>
                  <p className="text-[11px] text-gray-400">
                    {format(new Date(task.due_date), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
              </div>

              {/* Evidence submitted */}
              {evidence && (
                <div className="relative flex items-start gap-4">
                  <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-blue-400 ring-2 ring-white" />
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-gray-600">
                      Evidence submitted by{" "}
                      <span className="font-semibold text-gray-800">{submitter?.full_name}</span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      {format(new Date(evidence.submitted_at), "MMM d, yyyy · h:mm a")}
                    </p>
                  </div>
                </div>
              )}

              {/* Awaiting review */}
              <div className="relative flex items-start gap-4">
                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-emerald-600">
                    Awaiting your review
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky Action Dock ── */}
      <div className="fixed inset-x-0 bottom-0 z-40 lg:pl-[260px]">
        {/* Fade gradient */}
        <div className="pointer-events-none h-10 bg-gradient-to-t from-gray-50 to-transparent" />
        {/* Action bar */}
        <div className="border-t border-gray-200 bg-white/80 backdrop-blur-xl shadow-[0_-4px_24px_rgba(0,0,0,0.06)] safe-bottom">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400 sm:block">
              Review Action
            </p>
            <div className="flex flex-1 items-center justify-end gap-2">
              {/* Escalate */}
              <button
                onClick={() => setEscalateOpen(true)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-[12px] font-medium text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600"
              >
                <ArrowUpRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Escalate</span>
              </button>
              {/* Reject */}
              <button
                onClick={() => setRejectOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[12px] font-semibold text-red-600 transition-all duration-200 hover:bg-red-100 hover:border-red-300"
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </button>
              {/* Approve */}
              <button
                onClick={() => setApproveOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-[12px] font-semibold text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/25 active:scale-[0.98]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals ── */}
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
      <EscalateModal
        open={escalateOpen}
        onOpenChange={setEscalateOpen}
        onConfirm={handleEscalate}
      />

      {/* ── Photo Zoom Overlay ── */}
      {photoZoom && evidence && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
          onClick={() => setPhotoZoom(false)}
        >
          <button
            onClick={() => setPhotoZoom(false)}
            className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-gray-600 shadow-lg transition-all hover:bg-white hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={evidence.photo_url}
            alt="Task evidence full view"
            className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
}
