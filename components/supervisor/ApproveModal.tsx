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
import { CheckCircle2, Loader2 } from "lucide-react";

interface ApproveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (comment?: string) => Promise<void>;
}

export function ApproveModal({
  open,
  onOpenChange,
  onConfirm,
}: ApproveModalProps) {
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await onConfirm(comment || undefined);
    setLoading(false);
    setComment("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!loading) {
          onOpenChange(v);
          if (!v) setComment("");
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Approve Task Completion
          </DialogTitle>
          <DialogDescription>
            Approve this task completion? The staff member will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label htmlFor="approve-comment">Comment (optional)</Label>
          <Textarea
            id="approve-comment"
            placeholder="Add a comment for the staff member..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            className="resize-none"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setComment("");
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving…
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirm Approval
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
