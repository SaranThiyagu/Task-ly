"use client";

import { cn } from "@/lib/utils";

// Stable color palette for initials fallback — based on first letter of name
const AVATAR_COLORS = [
  "bg-blue-600",
  "bg-teal-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-pink-600",
  "bg-cyan-600",
  "bg-orange-600",
];

function getColor(name: string): string {
  const code = name.charCodeAt(0) || 0;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface UserAvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses: Record<string, { container: string; text: string }> = {
  sm: { container: "h-8 w-8", text: "text-xs" },
  md: { container: "h-10 w-10", text: "text-sm" },
  lg: { container: "h-14 w-14", text: "text-lg" },
  xl: { container: "h-20 w-20", text: "text-2xl" },
};

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const s = sizeClasses[size];
  const initials = getInitials(name);
  const color = getColor(name);

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={cn(
          s.container,
          "rounded-full object-cover ring-2 ring-white/20",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        s.container,
        color,
        "flex items-center justify-center rounded-full font-bold text-white ring-2 ring-white/20 select-none",
        s.text,
        className
      )}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
