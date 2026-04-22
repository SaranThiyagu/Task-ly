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
  X,
  Camera,
  Loader2,
  CheckCircle2,
  ImagePlus,
  FileText,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Pencil,
  Sparkles,
} from "lucide-react";

type Step = "upload" | "details" | "review";
const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Photo" },
  { key: "details", label: "Details" },
  { key: "review", label: "Review" },
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
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

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

      await new Promise((resolve) => setTimeout(resolve, 1200));
      toast.success("Task completed successfully!");
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

  // -- Step icon helper --
  function StepIcon({ stepKey, idx }: { stepKey: Step; idx: number }) {
    const isCompleted =
      (stepKey === "upload" && !!file && stepIndex > 0) ||
      (stepKey === "details" && stepIndex > 1);
    const isActive = step === stepKey;

    if (isCompleted) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm transition-all duration-300">
          <CheckCircle2 className="h-4 w-4" />
        </span>
      );
    }
    if (isActive) {
      return (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100 transition-all duration-300">
          {stepKey === "upload" && <Camera className="h-4 w-4" />}
          {stepKey === "details" && <FileText className="h-4 w-4" />}
          {stepKey === "review" && <CheckCircle2 className="h-4 w-4" />}
        </span>
      );
    }
    return (
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 text-xs font-bold transition-all duration-300">
        {idx + 1}
      </span>
    );
  }

  // -- Success overlay --
  if (success) {
    return (
      <Dialog open={open} onOpenChange={() => {}}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[100dvh] sm:max-h-[85vh] sm:max-w-xl max-sm:h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 flex flex-col items-center justify-center gap-0 p-0"
        >
          <div className="flex flex-col items-center justify-center py-20 px-8 completion-success-enter">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">
              Task Completed
            </h3>
            <p className="text-sm text-slate-500 text-center">
              Your submission has been sent for review.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[100dvh] sm:max-h-[85vh] sm:max-w-xl max-sm:h-[100dvh] max-sm:max-w-full max-sm:rounded-none max-sm:border-0 flex flex-col gap-0 p-0">
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-900">
              Submit Completion
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 line-clamp-1 mt-0.5">
              {taskTitle}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* ── Stepper ── */}
        <div className="px-6 pt-2 pb-4">
          <div className="flex items-center">
            {STEPS.map((s, i) => (
              <div key={s.key} className="flex items-center flex-1 last:flex-none">
                <button
                  type="button"
                  onClick={() => {
                    // Allow clicking completed steps to jump back
                    if (i < stepIndex) setStep(s.key);
                  }}
                  disabled={i > stepIndex}
                  className="flex flex-col items-center gap-1.5 group disabled:cursor-default cursor-pointer"
                >
                  <StepIcon stepKey={s.key} idx={i} />
                  <span
                    className={`text-[11px] font-medium tracking-wide transition-colors ${
                      step === s.key
                        ? "text-indigo-600"
                        : i < stepIndex
                          ? "text-emerald-600"
                          : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-3 mt-[-18px]">
                    <div className="h-0.5 rounded-full bg-slate-100 relative overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500 ease-out"
                        style={{ width: i < stepIndex ? "100%" : "0%" }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-6 border-t border-slate-100" />

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* === STEP 1: Upload === */}
          {step === "upload" && (
            <div className="space-y-4 completion-step-enter">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Upload Evidence
                </h3>
                <p className="text-xs text-slate-400">
                  Take a photo or upload an image of the completed work.
                </p>
              </div>

              {preview ? (
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 shadow-sm group">
                  <img
                    src={preview}
                    alt="Evidence preview"
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  <button
                    type="button"
                    onClick={clearFile}
                    className="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-all duration-200 min-h-[36px]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                  {uploading && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 rounded-full bg-white/20">
                          <div
                            className="h-1.5 rounded-full bg-gradient-to-r from-indigo-400 to-indigo-500 transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-white font-medium tabular-nums">
                          {uploadProgress}%
                        </span>
                      </div>
                      <p className="text-[10px] text-white/70 mt-1.5">{file?.name}</p>
                    </div>
                  )}
                  {!uploading && (
                    <div className="absolute bottom-3 left-3 completion-badge-enter">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-semibold text-white shadow-lg">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Photo ready
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-14 transition-all duration-200 active:scale-[0.99] ${
                    dragOver
                      ? "border-indigo-400 bg-indigo-50/50 scale-[1.01] completion-dropzone-glow"
                      : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50"
                  }`}
                >
                  <div
                    className={`rounded-2xl p-4 mb-4 transition-all duration-200 ${
                      dragOver
                        ? "bg-indigo-100 scale-110"
                        : "bg-slate-100 group-hover:bg-indigo-50"
                    }`}
                  >
                    <ImagePlus
                      className={`h-8 w-8 transition-colors duration-200 ${
                        dragOver ? "text-indigo-500" : "text-slate-400"
                      }`}
                    />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">
                    Tap to take photo
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    or drag & drop · PNG, JPG up to 10MB
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleInputChange}
                className="hidden"
              />
            </div>
          )}

          {/* === STEP 2: Details === */}
          {step === "details" && (
            <div className="space-y-4 completion-step-enter">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  What did you do?
                </h3>
                <p className="text-xs text-slate-400">
                  Describe the work completed, any issues encountered, or notes
                  for review.
                </p>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="notes"
                  className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider"
                >
                  Notes (optional)
                </Label>
                <div className="relative">
                  <Textarea
                    id="notes"
                    placeholder="Describe the work completed, any issues encountered..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value.slice(0, 500))}
                    rows={5}
                    className="resize-none rounded-xl border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 text-sm leading-relaxed transition-all duration-200"
                  />
                  <span
                    className={`absolute bottom-3 right-3 text-[10px] font-medium tabular-nums ${
                      notes.length > 450 ? "text-amber-500" : "text-slate-300"
                    }`}
                  >
                    {notes.length}/500
                  </span>
                </div>
              </div>

              {/* Quick-add note preview */}
              {preview && (
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <img
                    src={preview}
                    alt="Thumbnail"
                    className="h-10 w-10 rounded-lg object-cover ring-1 ring-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">
                      {file?.name}
                    </p>
                    <p className="text-[10px] text-slate-400">Photo attached</p>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                </div>
              )}
            </div>
          )}

          {/* === STEP 3: Review === */}
          {step === "review" && (
            <div className="space-y-4 completion-step-enter">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1">
                  Review Submission
                </h3>
                <p className="text-xs text-slate-400">
                  Double-check before submitting for supervisor review.
                </p>
              </div>

              {/* Photo summary */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Photo Evidence
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("upload")}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors min-h-[32px]"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                </div>
                {preview && (
                  <img
                    src={preview}
                    alt="Evidence"
                    className="w-full h-44 object-cover"
                  />
                )}
              </div>

              {/* Notes summary */}
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Notes
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep("details")}
                    className="flex items-center gap-1 text-[11px] font-medium text-indigo-600 hover:text-indigo-700 transition-colors min-h-[32px]"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                </div>
                <div className="px-4 py-3">
                  {notes ? (
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
                      {notes}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-400 italic">
                      No notes added.
                    </p>
                  )}
                </div>
              </div>

              {/* Task info */}
              <div className="rounded-xl bg-indigo-50/50 border border-indigo-100 px-4 py-3 flex items-start gap-3">
                <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                <p className="text-xs text-indigo-700 leading-relaxed">
                  Once submitted, your supervisor will review this completion.
                  You&apos;ll be notified when it&apos;s approved.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-slate-100 px-6 py-4 flex items-center gap-3 bg-slate-50/30">
          {step === "upload" ? (
            <Button
              variant="outline"
              onClick={() => {
                resetState();
                onOpenChange(false);
              }}
              disabled={submitting}
              className="min-h-[44px] rounded-xl text-sm"
            >
              Cancel
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={goBack}
              disabled={submitting}
              className="min-h-[44px] rounded-xl text-sm"
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
              className="min-h-[44px] rounded-xl text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md hover:shadow-lg disabled:shadow-none transition-all duration-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploading ? "Uploading…" : "Submitting…"}
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit Completion
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={goNext}
              disabled={step === "upload" && !file}
              className="min-h-[44px] rounded-xl text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-md hover:shadow-lg disabled:shadow-none disabled:opacity-50 transition-all duration-200"
            >
              Next
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
