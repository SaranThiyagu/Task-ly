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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { XCircle, Loader2 } from "lucide-react";

const QUICK_REASONS = [
  "Photo unclear",
  "Task incomplete",
  "Wrong location",
  "Needs redo",
];

interface RejectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function RejectModal({
  open,
  onOpenChange,
  onConfirm,
}: RejectModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  function handleQuickReason(text: string) {
    setReason((prev) => (prev ? `${prev}. ${text}` : text));
  }

  async function handleSubmit() {
    if (!reason.trim()) return;
    setLoading(true);
    await onConfirm(reason);
    setLoading(false);
    setReason("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          onOpenChange(v);
          if (!v) setReason("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Reject Task Completion
          </DialogTitle>
          <DialogDescription>
            Provide a reason for rejection. The staff member will be asked to
            redo the task.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick reason buttons */}
          <div className="space-y-2">
            <Label>Quick reasons</Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((qr) => (
                <Button
                  key={qr}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickReason(qr)}
                  className="text-xs"
                >
                  {qr}
                </Button>
              ))}
            </div>
          </div>

          {/* Reason textarea */}
          <div className="space-y-2">
            <Label htmlFor="reject-reason">
              Reason for rejection <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              placeholder="Describe why this submission is being rejected..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setReason("");
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !reason.trim()}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Rejecting…
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Submit Rejection
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
