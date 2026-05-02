"use client";

import {
  Building2,
  MapPin,
  Users,
  Shield,
  User,
  Mail,
  Calendar,
} from "lucide-react";

interface Props {
  profile: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
    role: string;
    created_at: string;
  };
  org: {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    is_active: boolean;
    created_at: string;
  } | null;
  sites: { id: string; name: string; address: string | null }[];
  teamCounts: { staff: number; supervisors: number };
}

export function ManagerSettingsClient({
  profile,
  org,
  sites,
  teamCounts,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Organization details and account information.
        </p>
      </div>

      {/* Organization Card */}
      {org && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-slate-900">
                  Organization
                </h2>
                <p className="text-[12px] text-slate-500">
                  Your workspace details
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            <Row label="Name" value={org.name} />
            <Row label="Slug" value={org.slug} />
            <Row
              label="Status"
              value={
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    org.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      org.is_active ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  {org.is_active ? "Active" : "Inactive"}
                </span>
              }
            />
            <Row
              label="Created"
              value={new Date(org.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          </div>
        </div>
      )}

      {/* Sites Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Sites</h2>
              <p className="text-[12px] text-slate-500">
                {sites.length} active site{sites.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          {sites.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">
              No sites configured yet.
            </div>
          ) : (
            sites.map((site) => (
              <div
                key={site.id}
                className="flex items-center gap-3 px-6 py-3.5"
              >
                <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-slate-900 truncate">
                    {site.name}
                  </p>
                  {site.address && (
                    <p className="text-[12px] text-slate-500 truncate">
                      {site.address}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Team Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">Team</h2>
              <p className="text-[12px] text-slate-500">
                Organization headcount
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="px-6 py-5 text-center">
            <p className="text-2xl font-extrabold text-slate-900">
              {teamCounts.supervisors}
            </p>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Supervisors
            </p>
          </div>
          <div className="px-6 py-5 text-center">
            <p className="text-2xl font-extrabold text-slate-900">
              {teamCounts.staff}
            </p>
            <p className="mt-1 text-[12px] font-medium text-slate-500">
              Staff Members
            </p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900">
                Your Account
              </h2>
              <p className="text-[12px] text-slate-500">
                Personal details and role
              </p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-100">
          <Row
            label="Name"
            value={profile.full_name}
            icon={<User className="h-4 w-4 text-slate-400" />}
          />
          <Row
            label="Email"
            value={profile.email}
            icon={<Mail className="h-4 w-4 text-slate-400" />}
          />
          <Row
            label="Role"
            value={
              <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700 capitalize">
                {profile.role}
              </span>
            }
          />
          <Row
            label="Member since"
            value={new Date(profile.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            icon={<Calendar className="h-4 w-4 text-slate-400" />}
          />
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-3.5">
      <span className="text-[13px] font-medium text-slate-500">{label}</span>
      <span className="flex items-center gap-2 text-[13px] font-semibold text-slate-900">
        {icon}
        {value}
      </span>
    </div>
  );
}
