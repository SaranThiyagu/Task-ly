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
import { ArrowUpRight, AlertTriangle, Loader2 } from "lucide-react";

interface EscalateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => Promise<void>;
}

export function EscalateModal({
  open,
  onOpenChange,
  onConfirm,
}: EscalateModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

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
            <ArrowUpRight className="h-5 w-5 text-orange-600" />
            Escalate to Manager
          </DialogTitle>
          <DialogDescription>
            This will escalate the task to a manager for further review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning */}
          <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-600 shrink-0" />
            <p className="text-sm text-orange-800">
              Manager will be notified immediately about this escalation.
            </p>
          </div>

          {/* Reason textarea */}
          <div className="space-y-2">
            <Label htmlFor="escalate-reason">
              Reason for escalation <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="escalate-reason"
              placeholder="Explain why this needs manager attention..."
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
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Escalating…
              </>
            ) : (
              <>
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Escalate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
