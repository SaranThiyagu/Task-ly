"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { completeTask } from "@/app/(staff)/staff/tasks/[id]/actions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload,
  Camera,
  Loader2,
  CheckCircle2,
  FileText,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Pencil,
  Sparkles,
  ImagePlus,
  PartyPopper,
} from "lucide-react";

/* ───── Design tokens ─────
   Primary  : #1E3A8A (deep blue)
   Success  : #22C55E (green)
*/

type Step = "upload" | "details" | "review";

const STEPS: { key: Step; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "upload", label: "Photo", icon: Camera },
  { key: "details", label: "Details", icon: FileText },
  { key: "review", label: "Review", icon: CheckCircle2 },
];

interface CompleteTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  taskTitle: string;
}

export function CompleteTaskModal({
  open,
  onOpenChange,
  taskId,
  taskTitle,
}: CompleteTaskModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [success, setSuccess] = useState(false);

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  /* ── File handling ── */

  function handleFileSelect(selectedFile: File) {
    if (!selectedFile.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selectedFile);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) handleFileSelect(selectedFile);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  }, []);

  function clearFile() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function resetState() {
    setFile(null);
    setPreview(null);
    setNotes("");
    setUploading(false);
    setUploadProgress(0);
    setSubmitting(false);
    setDragOver(false);
    setStep("upload");
    setSuccess(false);
  }

  function goNext() {
    if (step === "upload" && file) setStep("details");
    else if (step === "details") setStep("review");
  }

  function goBack() {
    if (step === "details") setStep("upload");
    else if (step === "review") setStep("details");
  }

  /* ── Submission ── */

  async function handleSubmit() {
    if (!file) {
      toast.error("Please upload a photo as evidence");
      return;
    }

    setSubmitting(true);
    setUploading(true);

    try {
      const supabase = createClient();
      const fileExt = file.name.split(".").pop();
      const fileName = `${taskId}/${Date.now()}.${fileExt}`;

      setUploadProgress(30);

      const { error: uploadError } = await supabase.storage
        .from("task-evidence")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        setSubmitting(false);
        setUploading(false);
        return;
      }

      setUploadProgress(70);

      const {
        data: { publicUrl },
      } = supabase.storage.from("task-evidence").getPublicUrl(fileName);

      setUploadProgress(100);
      setUploading(false);

      const result = await completeTask(taskId, publicUrl, notes);

      if (result.error) {
        toast.error(result.error);
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      await new Promise((r) => setTimeout(r, 1400));
      toast.success("Great job! Task submitted for review 🎉");
      resetState();
      onOpenChange(false);
      router.push("/staff/dashboard");
      router.refresh();
    } catch {
      toast.error("Something went wrong. Please try again.");
      setSubmitting(false);
      setUploading(false);
    }
  }

  /* ══════════════════════════════════════════════════
     SUCCESS OVERLAY
     ══════════════════════════════════════════════════ */
  if (success) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[100dvh] sm:max-h-[85vh] sm:max-w-md max-sm:h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 flex flex-col items-center justify-center p-0"
        >
          <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-200 blur-2xl opacity-60 animate-pulse" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/40">
                <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={2.5} />
              </div>
            </div>
            <h3 className="text-2xl font-extrabold text-slate-900 mb-2 flex items-center gap-2">
              Nice work! <PartyPopper className="h-6 w-6 text-amber-500" />
            </h3>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
              Your submission has been sent for supervisor review. You&apos;ll be
              notified when it&apos;s approved.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  /* ══════════════════════════════════════════════════
     MAIN MODAL
     ══════════════════════════════════════════════════ */
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] sm:max-h-[90vh] sm:max-w-xl max-sm:h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 flex flex-col gap-0 p-0">
        {/* ── Header ── */}
        <div className="px-5 sm:px-6 pt-5 pb-3">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl font-extrabold text-slate-900">
              Submit Completion
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1 line-clamp-1">
              {taskTitle}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Stepper ── */}
        <Stepper step={step} stepIndex={stepIndex} hasFile={!!file} setStep={setStep} />

        <div className="mx-5 sm:mx-6 border-t border-slate-100" />

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
          {step === "upload" && (
            <UploadStep
              preview={preview}
              file={file}
              dragOver={dragOver}
              uploading={uploading}
              uploadProgress={uploadProgress}
              fileInputRef={fileInputRef}
              onClear={clearFile}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onInputChange={handleInputChange}
            />
          )}

          {step === "details" && (
            <DetailsStep
              notes={notes}
              onNotesChange={setNotes}
              preview={preview}
              fileName={file?.name}
            />
          )}

          {step === "review" && (
            <ReviewStep
              preview={preview}
              notes={notes}
              onEditPhoto={() => setStep("upload")}
              onEditNotes={() => setStep("details")}
            />
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-5 sm:px-6 py-4 bg-slate-50/40">
          <div className="flex items-center gap-3">
            {step === "upload" ? (
              <Button
                variant="outline"
                onClick={() => {
                  resetState();
                  onOpenChange(false);
                }}
                disabled={submitting}
                className="min-h-[48px] rounded-xl text-sm font-semibold text-slate-600"
              >
                Cancel
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={goBack}
                disabled={submitting}
                className="min-h-[48px] rounded-xl text-sm font-semibold text-slate-700"
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back
              </Button>
            )}

            <div className="flex-1" />

            {step === "review" ? (
              <Button
                onClick={handleSubmit}
                disabled={submitting || !file}
                className="min-h-[48px] flex-1 sm:flex-none rounded-xl px-6 text-sm font-bold bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none transition active:scale-[0.98]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploading ? "Uploading…" : "Submitting…"}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Now
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={goNext}
                disabled={step === "upload" && !file}
                className="min-h-[48px] flex-1 sm:flex-none rounded-xl px-6 text-sm font-bold bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none transition active:scale-[0.98]"
              >
                Next
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ══════════════════════════════════════════════════
   STEPPER — encouraging progress indicator
   ══════════════════════════════════════════════════ */

function Stepper({
  step,
  stepIndex,
  hasFile,
  setStep,
}: {
  step: Step;
  stepIndex: number;
  hasFile: boolean;
  setStep: (s: Step) => void;
}) {
  return (
    <div className="px-5 sm:px-6 pb-4">
      <div className="flex items-center">
        {STEPS.map((s, i) => {
          const isCompleted =
            (s.key === "upload" && hasFile && stepIndex > 0) ||
            (s.key === "details" && stepIndex > 1);
          const isActive = step === s.key;
          const Icon = s.icon;

          return (
            <div key={s.key} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => {
                  if (i < stepIndex) setStep(s.key);
                }}
                disabled={i > stepIndex}
                className="flex flex-col items-center gap-1.5 disabled:cursor-default"
              >
                {isCompleted ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                ) : isActive ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1E3A8A] text-white shadow-md ring-4 ring-indigo-100 transition">
                    <Icon className="h-4 w-4" />
                  </span>
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs font-bold">
                    {i + 1}
                  </span>
                )}
                <span
                  className={`text-[11px] font-semibold tracking-wide ${
                    isActive
                      ? "text-[#1E3A8A]"
                      : isCompleted
                        ? "text-emerald-600"
                        : "text-slate-400"
                  }`}
                >
                  {s.label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-3 mt-[-18px]">
                  <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1E3A8A] to-emerald-500 transition-all duration-500"
                      style={{ width: i < stepIndex ? "100%" : "0%" }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   STEP 1 — Photo upload
   ══════════════════════════════════════════════════ */

function UploadStep({
  preview,
  file,
  dragOver,
  uploading,
  uploadProgress,
  fileInputRef,
  onClear,
  onDrop,
  onDragOver,
  onDragLeave,
  onInputChange,
}: {
  preview: string | null;
  file: File | null;
  dragOver: boolean;
  uploading: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onClear: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-extrabold text-slate-900 mb-1">
          Show us what you completed 📸
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Take a photo or upload an image of the completed work. This is
          required for supervisor review.
        </p>
      </div>

      {preview ? (
        <PhotoPreview
          preview={preview}
          fileName={file?.name}
          uploading={uploading}
          uploadProgress={uploadProgress}
          onClear={onClear}
        />
      ) : (
        <PhotoUploadZone
          dragOver={dragOver}
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onInputChange}
        className="hidden"
      />

      {/* Helper hints */}
      <ul className="space-y-1.5 text-xs text-slate-500">
        <li className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-emerald-500" />
          Make sure the photo clearly shows the completed work
        </li>
        <li className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-emerald-500" />
          Good lighting helps your supervisor approve faster
        </li>
      </ul>
    </div>
  );
}

/* ─── Reusable: PhotoUploadZone ─── */

function PhotoUploadZone({
  dragOver,
  onClick,
  onDrop,
  onDragOver,
  onDragLeave,
}: {
  dragOver: boolean;
  onClick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`group flex w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-14 sm:py-16 transition-all active:scale-[0.99] ${
        dragOver
          ? "border-[#1E3A8A] bg-indigo-50 scale-[1.01]"
          : "border-slate-300 bg-slate-50/60 hover:border-[#1E3A8A] hover:bg-indigo-50/40"
      }`}
    >
      <div
        className={`mb-4 flex h-20 w-20 items-center justify-center rounded-2xl shadow-md transition-transform group-hover:scale-105 ${
          dragOver
            ? "bg-[#1E3A8A] text-white"
            : "bg-gradient-to-br from-[#1E3A8A] to-indigo-600 text-white"
        }`}
      >
        <Camera className="h-9 w-9" strokeWidth={2} />
      </div>
      <p className="text-base font-bold text-slate-900">Tap to take photo</p>
      <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
        <ImagePlus className="h-3.5 w-3.5" />
        or drag &amp; drop · PNG, JPG up to 10MB
      </p>
    </button>
  );
}

/* ─── Photo preview with progress ─── */

function PhotoPreview({
  preview,
  fileName,
  uploading,
  uploadProgress,
  onClear,
}: {
  preview: string;
  fileName?: string;
  uploading: boolean;
  uploadProgress: number;
  onClear: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm group">
      <img
        src={preview}
        alt="Evidence preview"
        className="w-full h-72 object-cover"
      />
      <button
        type="button"
        onClick={onClear}
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 backdrop-blur px-3 py-2 text-xs font-semibold text-white hover:bg-red-600 transition min-h-[36px]"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Remove
      </button>
      {uploading ? (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 rounded-full bg-white/20">
              <div
                className="h-1.5 rounded-full bg-emerald-400 transition-all"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <span className="text-xs text-white font-bold tabular-nums">
              {uploadProgress}%
            </span>
          </div>
          <p className="text-[11px] text-white/80 mt-1.5">{fileName}</p>
        </div>
      ) : (
        <div className="absolute bottom-3 left-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Photo ready
          </span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   STEP 2 — Details / notes
   ══════════════════════════════════════════════════ */

function DetailsStep({
  notes,
  onNotesChange,
  preview,
  fileName,
}: {
  notes: string;
  onNotesChange: (v: string) => void;
  preview: string | null;
  fileName?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-extrabold text-slate-900 mb-1">
          Add a quick note
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Tell your supervisor what you did or any issues you ran into.
          (Optional — but helpful!)
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="notes"
          className="text-[11px] font-bold text-slate-500 uppercase tracking-wider"
        >
          Notes
        </Label>
        <div className="relative">
          <Textarea
            id="notes"
            placeholder="e.g. Cleaned all glass panels, replaced 3 bin liners…"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value.slice(0, 500))}
            rows={6}
            className="resize-none rounded-xl border-slate-200 focus:border-[#1E3A8A] focus:ring-2 focus:ring-indigo-100 text-sm leading-relaxed"
          />
          <span
            className={`absolute bottom-3 right-3 text-[10px] font-semibold tabular-nums ${
              notes.length > 450 ? "text-amber-500" : "text-slate-300"
            }`}
          >
            {notes.length}/500
          </span>
        </div>
      </div>

      {preview && (
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <img
            src={preview}
            alt="Thumbnail"
            className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-200"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">
              {fileName ?? "Evidence photo"}
            </p>
            <p className="text-[10px] text-slate-500">Photo attached ✓</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   STEP 3 — Review summary
   ══════════════════════════════════════════════════ */

function ReviewStep({
  preview,
  notes,
  onEditPhoto,
  onEditNotes,
}: {
  preview: string | null;
  notes: string;
  onEditPhoto: () => void;
  onEditNotes: () => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-extrabold text-slate-900 mb-1">
          One last check
        </h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          Make sure everything looks good before submitting for review.
        </p>
      </div>

      {/* Photo */}
      <ReviewCard
        label="Photo Evidence"
        icon={<Camera className="h-3.5 w-3.5 text-slate-500" />}
        onEdit={onEditPhoto}
      >
        {preview && (
          <img src={preview} alt="Evidence" className="w-full h-48 object-cover" />
        )}
      </ReviewCard>

      {/* Notes */}
      <ReviewCard
        label="Notes"
        icon={<FileText className="h-3.5 w-3.5 text-slate-500" />}
        onEdit={onEditNotes}
      >
        <div className="px-4 py-3">
          {notes ? (
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {notes}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">No notes added.</p>
          )}
        </div>
      </ReviewCard>

      {/* Encouragement */}
      <div className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
        <Sparkles className="h-4 w-4 text-[#1E3A8A] mt-0.5 shrink-0" />
        <p className="text-xs text-indigo-900 leading-relaxed">
          Once submitted, your supervisor will review and approve. You&apos;re
          almost done!
        </p>
      </div>
    </div>
  );
}

function ReviewCard({
  label,
  icon,
  onEdit,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-[#1E3A8A] hover:bg-indigo-100 transition min-h-[32px]"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
      </div>
      {children}
    </div>
  );
}
