"use client";

import { useState } from "react";
import {
  Building2,
  MapPin,
  Users,
  Shield,
  User,
  Mail,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SiteRow {
  id: string;
  name: string;
  address: string | null;
}

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
  sites: SiteRow[];
  teamCounts: { staff: number; supervisors: number };
}

export function ManagerSettingsClient({
  profile,
  org,
  sites: initialSites,
  teamCounts,
}: Props) {
  const [sites, setSites] = useState<SiteRow[]>(initialSites);

  // ── Add form ──
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // ── Edit form (one at a time) ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // ── Deactivate ──
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) { setAddError("Site name is required."); return; }
    setAddError(null);
    setAddLoading(true);
    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), address: addAddress.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setAddError(data.error ?? "Failed to add site."); return; }
      setSites((prev) => [...prev, data.site].sort((a, b) => a.name.localeCompare(b.name)));
      setAddName("");
      setAddAddress("");
      setShowAddForm(false);
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(site: SiteRow) {
    setEditingId(site.id);
    setEditName(site.name);
    setEditAddress(site.address ?? "");
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim()) { setEditError("Site name is required."); return; }
    if (!editingId) return;
    setEditError(null);
    setEditLoading(true);
    try {
      const res = await fetch(`/api/sites/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), address: editAddress.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setEditError(data.error ?? "Failed to update site."); return; }
      setSites((prev) =>
        prev.map((s) => (s.id === editingId ? data.site : s)).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingId(null);
    } catch {
      setEditError("Network error. Please try again.");
    } finally {
      setEditLoading(false);
    }
  }

  async function handleDeactivate(siteId: string) {
    setDeactivatingId(siteId);
    try {
      const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
      if (!res.ok) return;
      setSites((prev) => prev.filter((s) => s.id !== siteId));
    } finally {
      setDeactivatingId(null);
    }
  }

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
          <div className="flex items-center justify-between">
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
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowAddForm((v) => !v); setAddError(null); }}
              className="h-8 gap-1.5 rounded-lg text-[12px] font-bold"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Site
            </Button>
          </div>
        </div>

        {/* Add form */}
        {showAddForm && (
          <form onSubmit={handleAdd} className="border-b border-slate-100 bg-blue-50/40 px-6 py-4 space-y-3">
            <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500">New Site</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Site name *"
                maxLength={80}
                className="h-9 flex-1 rounded-lg text-[13px]"
                autoFocus
              />
              <Input
                value={addAddress}
                onChange={(e) => setAddAddress(e.target.value)}
                placeholder="Address (optional)"
                maxLength={160}
                className="h-9 flex-1 rounded-lg text-[13px]"
              />
            </div>
            {addError && (
              <p className="text-[12px] font-semibold text-red-600">{addError}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={addLoading}
                className="h-8 gap-1.5 rounded-lg bg-blue-600 text-[12px] font-bold text-white hover:bg-blue-700"
              >
                {addLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => { setShowAddForm(false); setAddName(""); setAddAddress(""); setAddError(null); }}
                className="h-8 gap-1.5 rounded-lg text-[12px] font-bold"
              >
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="divide-y divide-slate-100">
          {sites.length === 0 && !showAddForm ? (
            <div className="px-6 py-8 text-center text-sm text-slate-400">
              No sites configured yet. Add your first site above.
            </div>
          ) : (
            sites.map((site) => (
              <div key={site.id}>
                {editingId === site.id ? (
                  /* ── Inline edit row ── */
                  <form onSubmit={handleEdit} className="bg-amber-50/40 px-6 py-3.5 space-y-2">
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Site name *"
                        maxLength={80}
                        className="h-9 flex-1 rounded-lg text-[13px]"
                        autoFocus
                      />
                      <Input
                        value={editAddress}
                        onChange={(e) => setEditAddress(e.target.value)}
                        placeholder="Address (optional)"
                        maxLength={160}
                        className="h-9 flex-1 rounded-lg text-[13px]"
                      />
                    </div>
                    {editError && (
                      <p className="text-[12px] font-semibold text-red-600">{editError}</p>
                    )}
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        disabled={editLoading}
                        className="h-8 gap-1.5 rounded-lg bg-amber-500 text-[12px] font-bold text-white hover:bg-amber-600"
                      >
                        {editLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => { setEditingId(null); setEditError(null); }}
                        className="h-8 gap-1.5 rounded-lg text-[12px] font-bold"
                      >
                        <X className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  /* ── Normal row ── */
                  <div className="flex items-center gap-3 px-6 py-3.5">
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
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(site)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                        title="Edit site"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(site.id)}
                        disabled={deactivatingId === site.id}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                        title="Deactivate site"
                      >
                        {deactivatingId === site.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
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
