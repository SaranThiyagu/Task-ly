"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format, addHours } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList,
  User,
  MapPin,
  CalendarClock,
  Loader2,
  AlertOctagon,
  Flame,
  CheckCircle2,
} from "lucide-react";
import type { Site, TaskPriority } from "@/lib/types";

export interface StaffOption {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: StaffOption[];
  /** Pre-select a staff member (e.g. when launched from team page) */
  defaultAssignee?: string;
}

const PRIORITIES: { value: TaskPriority; label: string; icon: React.ReactNode; ring: string; active: string }[] = [
  {
    value: "critical",
    label: "Critical",
    icon: <AlertOctagon className="h-3.5 w-3.5" />,
    ring: "ring-red-400",
    active: "bg-red-500 text-white shadow-md shadow-red-500/30",
  },
  {
    value: "high",
    label: "High",
    icon: <Flame className="h-3.5 w-3.5" />,
    ring: "ring-orange-400",
    active: "bg-orange-500 text-white shadow-md shadow-orange-500/30",
  },
  {
    value: "medium",
    label: "Medium",
    icon: null,
    ring: "ring-yellow-300",
    active: "bg-yellow-300 text-yellow-900 shadow-md",
  },
  {
    value: "low",
    label: "Low",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    ring: "ring-emerald-400",
    active: "bg-emerald-500 text-white shadow-md shadow-emerald-500/30",
  },
];

export function CreateTaskModal({
  open,
  onOpenChange,
  staffList,
  defaultAssignee = "",
}: CreateTaskModalProps) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState(defaultAssignee);
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [siteId, setSiteId] = useState("");
  const [dueDate, setDueDate] = useState(
    format(addHours(new Date(), 4), "yyyy-MM-dd'T'HH:mm")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Sites dropdown ──
  const [sites, setSites] = useState<Pick<Site, "id" | "name" | "address">[]>([]);
  const [sitesLoading, setSitesLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSitesLoading(true);
    fetch("/api/sites")
      .then((r) => r.json())
      .then((d) => setSites(d.sites ?? []))
      .catch(() => setSites([]))
      .finally(() => setSitesLoading(false));
  }, [open]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setAssignedTo(defaultAssignee);
    setPriority("medium");
    setSiteId("");
    setDueDate(format(addHours(new Date(), 4), "yyyy-MM-dd'T'HH:mm"));
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) resetForm();
    onOpenChange(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Task title is required."); return; }
    if (!assignedTo) { setError("Please select a staff member to assign."); return; }
    if (!dueDate) { setError("Please set a due date."); return; }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          assigned_to: assignedTo,
          priority,
          site_id: siteId || undefined,
          // Populate site_location with the site name for legacy schema compat
          site_location: siteId
            ? (sites.find((s) => s.id === siteId)?.name ?? undefined)
            : undefined,
          due_date: new Date(dueDate).toISOString(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Failed to create task. Please try again.");
        return;
      }

      handleOpenChange(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const minDateTime = format(new Date(), "yyyy-MM-dd'T'HH:mm");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1E3A8A]/10">
              <ClipboardList className="h-5 w-5 text-[#1E3A8A]" />
            </div>
            <div>
              <DialogTitle className="text-[17px] font-extrabold text-slate-900">
                Create & Assign Task
              </DialogTitle>
              <DialogDescription className="text-[12px] text-slate-500">
                New task will be pushed to the assigned staff member.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-5">
          {/* ── Title ── */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-title" className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
              Task Title *
            </Label>
            <Input
              id="ct-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Clean and inspect Room 412"
              maxLength={120}
              className="h-11 rounded-xl border-slate-200 text-[14px] focus:border-indigo-300 focus:ring-indigo-100"
              autoFocus
            />
          </div>

          {/* ── Description ── */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-desc" className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
              Description
            </Label>
            <Textarea
              id="ct-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add checklist items, special instructions, or notes…"
              rows={3}
              maxLength={500}
              className="resize-none rounded-xl border-slate-200 text-[14px] focus:border-indigo-300 focus:ring-indigo-100"
            />
          </div>

          {/* ── Assign To ── */}
          <div className="space-y-1.5">
            <Label htmlFor="ct-assign" className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                Assign To *
              </span>
            </Label>
            <select
              id="ct-assign"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-[14px] text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">— Select staff member —</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* ── Priority ── */}
          <div className="space-y-1.5">
            <Label className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
              Priority
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  className={`inline-flex items-center justify-center gap-1 rounded-xl px-2 py-2.5 text-[11.5px] font-bold transition min-h-[40px] ${
                    priority === p.value
                      ? p.active
                      : "bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Site / Location + Due Date row ── */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ct-site" className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Site / Location
                </span>
              </Label>
              <select
                id="ct-site"
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                disabled={sitesLoading}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 text-[14px] text-slate-700 shadow-sm focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
              >
                <option value="">— No location —</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.address ? ` · ${s.address}` : ""}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Locations are managed in{" "}
                <a href="/manager/settings" className="underline hover:text-slate-600">
                  Settings
                </a>.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ct-due" className="text-[12px] font-bold uppercase tracking-wider text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Due Date & Time *
                </span>
              </Label>
              <Input
                id="ct-due"
                type="datetime-local"
                value={dueDate}
                min={minDateTime}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 rounded-xl border-slate-200 text-[14px] focus:border-indigo-300 focus:ring-indigo-100"
              />
            </div>
          </div>

          {/* ── Error ── */}
          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-[12.5px] font-semibold text-red-600 ring-1 ring-red-200">
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 pt-1 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="h-11 flex-1 rounded-xl text-[13px] font-bold sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !title.trim() || !assignedTo || !dueDate}
              className="h-11 flex-1 rounded-xl bg-[#1E3A8A] text-[13px] font-bold text-white shadow-md shadow-indigo-500/20 hover:bg-[#172e6e] sm:flex-none sm:min-w-[140px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                "Create & Assign"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
