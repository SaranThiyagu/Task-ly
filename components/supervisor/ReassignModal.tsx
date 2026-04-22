"use client";

import { useState } from "react";
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
import { UserCircle, Loader2, ArrowRightLeft, CalendarDays } from "lucide-react";
import { format, addHours } from "date-fns";

interface StaffOption {
  id: string;
  full_name: string;
}

interface ReassignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (newAssigneeId: string, newDueDate: string) => Promise<void>;
  staffList: StaffOption[];
  currentAssignee?: string;
  taskTitle?: string;
}

export function ReassignModal({
  open,
  onOpenChange,
  onConfirm,
  staffList,
  currentAssignee,
  taskTitle,
}: ReassignModalProps) {
  const [selectedStaff, setSelectedStaff] = useState("");
  const [newDueDate, setNewDueDate] = useState(
    format(addHours(new Date(), 4), "yyyy-MM-dd'T'HH:mm")
  );
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!selectedStaff || !newDueDate) return;
    setLoading(true);
    await onConfirm(selectedStaff, new Date(newDueDate).toISOString());
    setLoading(false);
    setSelectedStaff("");
  }

  // Filter out current assignee from the list
  const availableStaff = staffList.filter(
    (s) => s.full_name !== currentAssignee
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          onOpenChange(v);
          if (!v) setSelectedStaff("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            Reassign Task
          </DialogTitle>
          <DialogDescription>
            {taskTitle
              ? `Reassign "${taskTitle}" to another staff member.`
              : "Select a staff member to reassign this task to."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {currentAssignee && (
            <div className="flex items-center gap-2 rounded-lg border bg-gray-50 p-3 text-sm">
              <UserCircle className="h-4 w-4 text-slate-400" />
              <span className="text-slate-500">Currently assigned to</span>
              <span className="font-medium text-slate-900">
                {currentAssignee}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reassign-staff">Reassign to</Label>
            <select
              id="reassign-staff"
              value={selectedStaff}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a staff member...</option>
              {availableStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reassign-deadline" className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
              New Deadline
            </Label>
            <Input
              id="reassign-deadline"
              type="datetime-local"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedStaff("");
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading || !selectedStaff || !newDueDate}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Reassigning…
              </>
            ) : (
              <>
                <ArrowRightLeft className="mr-2 h-4 w-4" />
                Confirm Reassign
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
