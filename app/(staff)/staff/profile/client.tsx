"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  Mail,
  Shield,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  LogOut,
  TrendingUp,
  ChevronRight,
  Camera,
  Loader2,
  Zap,
  Award,
  Target,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { updateAvatarUrl } from "./actions";
import type { Profile } from "@/lib/types";

interface ProfileClientProps {
  profile: Profile;
  stats: { total: number; completed: number };
}

export function ProfileClient({ profile, stats }: ProfileClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile.avatar_url);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function resizeImage(file: File, maxSize = 256): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas not supported"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error("Resize failed"))),
          "image/webp",
          0.85
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);

    try {
      const resized = await resizeImage(file);
      const supabase = createClient();
      const filePath = `${profile.id}/avatar.webp`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, resized, {
          contentType: "image/webp",
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        toast.error(`Upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(filePath);

      const avatarUrl = `${publicUrl}?t=${Date.now()}`;

      const result = await updateAvatarUrl(avatarUrl);

      if (result.error) {
        toast.error(result.error);
      } else {
        setCurrentAvatarUrl(avatarUrl);
        toast.success("Profile photo updated!");
        router.refresh();
      }
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const pending = stats.total - stats.completed;

  // Performance tier
  const tier =
    completionRate >= 90
      ? { label: "Outstanding", color: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-200" }
      : completionRate >= 70
        ? { label: "Great", color: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-200" }
        : completionRate >= 50
          ? { label: "Good", color: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-200" }
          : { label: "Needs Focus", color: "text-slate-600", bg: "bg-slate-50", ring: "ring-slate-200" };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Hero Card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm">
        {/* Gradient banner */}
        <div className="h-28 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(139,92,246,0.1),transparent_60%)]" />
        </div>

        {/* Avatar + info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10">
            {/* Avatar */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="group relative rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 disabled:opacity-70 shrink-0 self-start"
            >
              <UserAvatar
                name={profile.full_name}
                avatarUrl={currentAvatarUrl}
                size="xl"
                className="ring-4 ring-white shadow-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 group-hover:bg-black/40 transition-all duration-200">
                {uploading ? (
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                ) : (
                  <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Name + meta */}
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl font-semibold text-slate-900 truncate">
                {profile.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600 capitalize">
                  <Shield className="h-3 w-3" />
                  {profile.role}
                </span>
                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tier.bg} ${tier.color} ${tier.ring}`}>
                  <Award className="h-3 w-3" />
                  {tier.label}
                </span>
              </div>
            </div>

            {/* Edit photo hint */}
            <p className="text-[11px] text-slate-400 hidden sm:block pb-1.5">
              Click avatar to change
            </p>
          </div>
        </div>
      </div>

      {/* ── Stats Cards ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <ClipboardList className="h-4 w-4 text-indigo-600" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Assigned
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total tasks</p>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Done
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{stats.completed}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Completed</p>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm hover:shadow-md transition-shadow duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50">
              <Target className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              Pending
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 tabular-nums">{pending}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">In progress</p>
        </div>
      </div>

      {/* ── Performance Card ── */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50">
              <TrendingUp className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Performance</p>
              <p className="text-[11px] text-slate-400">Task completion rate</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900 tabular-nums">{completionRate}%</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative">
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ease-out ${
                completionRate >= 80
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                  : completionRate >= 50
                    ? "bg-gradient-to-r from-amber-500 to-amber-400"
                    : "bg-gradient-to-r from-red-500 to-red-400"
              }`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Mini breakdown */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] text-slate-500">
                {stats.completed} completed
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-slate-300" />
              <span className="text-[11px] text-slate-500">
                {pending} remaining
              </span>
            </div>
          </div>
          <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${tier.color}`}>
            <Zap className="h-3 w-3" />
            {tier.label}
          </span>
        </div>
      </div>

      {/* ── Account Details ── */}
      <div className="rounded-2xl border border-slate-200/60 bg-white overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="text-sm font-semibold text-slate-900">Account Details</h2>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 shrink-0">
              <Mail className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Email
              </p>
              <p className="text-sm font-medium text-slate-900 truncate">
                {profile.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 shrink-0">
              <Shield className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Role
              </p>
              <p className="text-sm font-medium text-slate-900 capitalize">
                {profile.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 shrink-0">
              <CalendarDays className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Member Since
              </p>
              <p className="text-sm font-medium text-slate-900">
                {format(new Date(profile.created_at), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sign Out ── */}
      <button
        onClick={handleLogout}
        className="group flex w-full items-center justify-between rounded-2xl border border-red-100 bg-white px-5 py-4 text-red-600 transition-all duration-200 hover:bg-red-50 hover:border-red-200 active:scale-[0.99] shadow-sm"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 group-hover:bg-red-100 transition-colors">
            <LogOut className="h-4 w-4 text-red-500" />
          </div>
          <span className="text-sm font-semibold">Sign Out</span>
        </div>
        <ChevronRight className="h-4 w-4 text-red-300 group-hover:translate-x-0.5 transition-transform duration-200" />
      </button>
    </div>
  );
}
