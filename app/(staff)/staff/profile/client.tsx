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
  Camera,
  Loader2,
  Award,
  Hourglass,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { updateAvatarUrl } from "./actions";
import type { Profile } from "@/lib/types";

interface ProfileClientProps {
  profile: Profile;
  stats: { total: number; completed: number };
}

/* ───── Design tokens ─────
   Primary  : #1E3A8A (deep blue)
   Success  : #22C55E (green)
   Warning  : #F59E0B (orange)
   Danger   : #EF4444 (red)
*/

export function ProfileClient({ profile, stats }: ProfileClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(profile.avatar_url);

  /* ── Logout ── */
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  /* ── Avatar upload ── */
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
          0.85,
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

  /* ── Derived values ── */
  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
  const pending = stats.total - stats.completed;

  const tier = getPerformanceTier(completionRate);
  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="mx-auto max-w-2xl space-y-5 sm:space-y-6 pb-24 lg:pb-6">
      {/* ════════ HEADER ════════ */}
      <header>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          My Profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Your performance and account information
        </p>
      </header>

      {/* ════════ HERO CARD ════════ */}
      <ProfileHero
        profile={profile}
        avatarUrl={currentAvatarUrl}
        uploading={uploading}
        tier={tier}
        firstName={firstName}
        onAvatarClick={() => fileInputRef.current?.click()}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* ════════ STATS CARDS ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          tone="blue"
          icon={<ClipboardList className="h-6 w-6" />}
          label="Assigned"
          subLabel="Total tasks"
          count={stats.total}
        />
        <StatCard
          tone="green"
          icon={<CheckCircle2 className="h-6 w-6" />}
          label="Completed"
          subLabel="Great work!"
          count={stats.completed}
        />
        <StatCard
          tone="orange"
          icon={<Hourglass className="h-6 w-6" />}
          label="Pending"
          subLabel="In progress"
          count={pending}
          pulse={pending > 0}
        />
      </div>

      {/* ════════ PERFORMANCE CARD ════════ */}
      <PerformanceCard
        completionRate={completionRate}
        completed={stats.completed}
        pending={pending}
        tier={tier}
      />

      {/* ════════ ACCOUNT DETAILS ════════ */}
      <AccountDetails profile={profile} />

      {/* ════════ SIGN OUT ════════ */}
      <button
        onClick={handleLogout}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white px-5 py-4 text-sm font-bold text-red-600 shadow-sm transition hover:bg-red-50 active:scale-[0.99] min-h-[56px]"
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PROFILE HERO — clean light card with avatar + tier
   ══════════════════════════════════════════════════ */

function ProfileHero({
  profile,
  avatarUrl,
  uploading,
  tier,
  firstName,
  onAvatarClick,
}: {
  profile: Profile;
  avatarUrl: string | null;
  uploading: boolean;
  tier: ReturnType<typeof getPerformanceTier>;
  firstName: string;
  onAvatarClick: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Soft brand banner */}
      <div className="h-24 bg-gradient-to-br from-[#1E3A8A] via-indigo-600 to-blue-500 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.25),transparent_60%)]" />
        <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
      </div>

      <div className="px-5 sm:px-6 pb-6">
        {/* Avatar — pulled up over the banner */}
        <div className="flex justify-center sm:justify-start -mt-14 sm:-mt-16">
          <button
            type="button"
            onClick={onAvatarClick}
            disabled={uploading}
            className="group relative shrink-0 rounded-full focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
          >
            <UserAvatar
              name={profile.full_name}
              avatarUrl={avatarUrl}
              size="xl"
              className="h-24 w-24 sm:h-28 sm:w-28 text-3xl ring-4 ring-white shadow-lg"
            />
            {/* Camera badge */}
            <span className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full bg-[#1E3A8A] text-white shadow-md ring-2 ring-white transition group-hover:scale-110">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </span>
          </button>
        </div>

        {/* Name + chips — sits cleanly below the avatar */}
        <div className="mt-4 text-center sm:text-left">
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 truncate">
            {profile.full_name}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back, {firstName} 👋
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">
              <Shield className="h-3 w-3" />
              {profile.role}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ${tier.chipCls}`}
            >
              <Award className="h-3 w-3" />
              {tier.label}
            </span>
          </div>
        </div>

        {/* Hint */}
        <p className="mt-4 text-center text-[11px] text-slate-400 sm:text-left">
          Tap the camera icon to change your photo
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   STAT CARD
   ══════════════════════════════════════════════════ */

function StatCard({
  tone,
  icon,
  label,
  subLabel,
  count,
  pulse,
}: {
  tone: "blue" | "green" | "orange";
  icon: React.ReactNode;
  label: string;
  subLabel: string;
  count: number;
  pulse?: boolean;
}) {
  const tones = {
    blue: {
      iconBg: "bg-[#1E3A8A] text-white shadow-indigo-500/30",
      ring: "ring-indigo-100",
      labelColor: "text-[#1E3A8A]",
    },
    green: {
      iconBg: "bg-emerald-500 text-white shadow-emerald-500/30",
      ring: "ring-emerald-100",
      labelColor: "text-emerald-700",
    },
    orange: {
      iconBg: "bg-amber-500 text-white shadow-amber-500/30",
      ring: "ring-amber-100",
      labelColor: "text-amber-700",
    },
  }[tone];

  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md ring-1 ${tones.ring}`}
    >
      <div
        className={`mb-3 flex h-12 w-12 items-center justify-center rounded-2xl shadow-md ${tones.iconBg} ${
          pulse ? "animate-pulse" : ""
        }`}
      >
        {icon}
      </div>
      <p className="text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">
        {count}
      </p>
      <p className={`mt-1 text-xs font-bold uppercase tracking-wider ${tones.labelColor}`}>
        {label}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">{subLabel}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PERFORMANCE CARD
   ══════════════════════════════════════════════════ */

function PerformanceCard({
  completionRate,
  completed,
  pending,
  tier,
}: {
  completionRate: number;
  completed: number;
  pending: number;
  tier: ReturnType<typeof getPerformanceTier>;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-3xl border-2 ${tier.cardBorder} ${tier.cardBg} p-5 sm:p-6 shadow-sm`}
    >
      {/* Decorative blob */}
      <div
        className={`pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full ${tier.blob} blur-3xl`}
      />

      <div className="relative">
        {/* Title row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${tier.iconBg} text-white shadow-md`}
            >
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Performance
              </h3>
              <p className="text-[11px] text-slate-500">Task completion rate</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider ${tier.chipSolid}`}
          >
            <Sparkles className="h-3 w-3" />
            {tier.label}
          </span>
        </div>

        {/* Big rate + encouragement */}
        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p
              className={`text-5xl sm:text-6xl font-extrabold tabular-nums leading-none ${tier.numberColor}`}
            >
              {completionRate}
              <span className="text-3xl">%</span>
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {tier.encouragement}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="h-3 w-full rounded-full bg-white/70 ring-1 ring-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full ${tier.barBg} transition-all duration-1000 ease-out`}
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="mt-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {completed} completed
            </span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              {pending} remaining
            </span>
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            this period
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   ACCOUNT DETAILS
   ══════════════════════════════════════════════════ */

function AccountDetails({ profile }: { profile: Profile }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Account Details
        </h2>
      </div>
      <div className="divide-y divide-slate-100">
        <DetailRow
          icon={<Mail className="h-4 w-4 text-blue-600" />}
          iconBg="bg-blue-50"
          label="Email"
          value={profile.email}
        />
        <DetailRow
          icon={<Shield className="h-4 w-4 text-violet-600" />}
          iconBg="bg-violet-50"
          label="Role"
          value={profile.role}
          valueClass="capitalize"
        />
        <DetailRow
          icon={<CalendarDays className="h-4 w-4 text-amber-600" />}
          iconBg="bg-amber-50"
          label="Member Since"
          value={format(new Date(profile.created_at), "MMMM d, yyyy")}
        />
      </div>
    </section>
  );
}

function DetailRow({
  icon,
  iconBg,
  label,
  value,
  valueClass,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50/50">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p
          className={`mt-0.5 truncate text-sm font-semibold text-slate-900 ${valueClass ?? ""}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PERFORMANCE TIER HELPER
   ══════════════════════════════════════════════════ */

function getPerformanceTier(rate: number) {
  if (rate >= 90) {
    return {
      label: "Outstanding",
      encouragement: "You're crushing it — keep up the amazing work! 🏆",
      chipCls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      chipSolid: "bg-emerald-500 text-white",
      cardBg: "bg-gradient-to-br from-emerald-50 via-white to-teal-50",
      cardBorder: "border-emerald-200",
      iconBg: "bg-emerald-500",
      blob: "bg-emerald-300/30",
      numberColor: "text-emerald-600",
      barBg: "bg-gradient-to-r from-emerald-500 to-emerald-400",
    };
  }
  if (rate >= 70) {
    return {
      label: "Great",
      encouragement: "Great work — you're nearly there! 💪",
      chipCls: "bg-blue-50 text-blue-700 ring-blue-200",
      chipSolid: "bg-[#1E3A8A] text-white",
      cardBg: "bg-gradient-to-br from-indigo-50 via-white to-blue-50",
      cardBorder: "border-indigo-200",
      iconBg: "bg-[#1E3A8A]",
      blob: "bg-indigo-300/30",
      numberColor: "text-[#1E3A8A]",
      barBg: "bg-gradient-to-r from-[#1E3A8A] to-indigo-500",
    };
  }
  if (rate >= 50) {
    return {
      label: "Good",
      encouragement: "Good progress — keep pushing! 🚀",
      chipCls: "bg-amber-50 text-amber-800 ring-amber-200",
      chipSolid: "bg-amber-500 text-white",
      cardBg: "bg-gradient-to-br from-amber-50 via-white to-orange-50",
      cardBorder: "border-amber-200",
      iconBg: "bg-amber-500",
      blob: "bg-amber-300/30",
      numberColor: "text-amber-600",
      barBg: "bg-gradient-to-r from-amber-500 to-amber-400",
    };
  }
  return {
    label: "Getting Started",
    encouragement: "Every task counts — you've got this! 💙",
    chipCls: "bg-slate-100 text-slate-700 ring-slate-200",
    chipSolid: "bg-slate-700 text-white",
    cardBg: "bg-gradient-to-br from-slate-50 via-white to-slate-100",
    cardBorder: "border-slate-200",
    iconBg: "bg-slate-600",
    blob: "bg-slate-300/20",
    numberColor: "text-slate-700",
    barBg: "bg-gradient-to-r from-slate-500 to-slate-400",
  };
}
