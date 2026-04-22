"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Download,
  Search,
  CheckCircle2,
  UserCircle,
  MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Profile, TaskPriority, TaskStatus } from "@/lib/types";
import { PRIORITY_CONFIG, STATUS_CONFIG } from "@/lib/types";
import { EscalationBanner } from "@/components/manager/EscalationBanner";

// ── Types ──

interface TaskRow {
  id: string;
  title: string;
  site_location: string | null;
  due_date: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to_profile:
    | Pick<Profile, "id" | "full_name" | "avatar_url">
    | Pick<Profile, "id" | "full_name" | "avatar_url">[];
}

interface EscalationRow {
  id: string;
  reason: string;
  escalated_at: string;
  is_resolved: boolean;
  task: { id: string; title: string } | { id: string; title: string }[];
  from_profile: { id: string; full_name: string } | { id: string; full_name: string }[];
  to_profile: { id: string; full_name: string } | { id: string; full_name: string }[];
  staff_profile:
    | { assigned_to_profile: { id: string; full_name: string } | { id: string; full_name: string }[] }
    | { assigned_to_profile: { id: string; full_name: string } | { id: string; full_name: string }[] }[];
}

interface KPIs {
  totalToday: number;
  completionRate: number;
  overdueCount: number;
  escalationCount: number;
  pendingReviews: number;
}

interface ChartDay {
  date: string;
  completed: number;
  overdue: number;
}

interface ManagerDashboardClientProps {
  profile: Profile;
  allTasks: TaskRow[];
  kpis: KPIs;
  escalations: EscalationRow[];
  chartData: ChartDay[];
}

function unwrap<T>(val: T | T[]): T {
  return Array.isArray(val) ? val[0] : val;
}

type SortKey = "title" | "due_date" | "status" | "priority";
type SortDir = "asc" | "desc";

// ── Component ──

export function ManagerDashboardClient({
  profile,
  allTasks,
  kpis,
  escalations: initialEscalations,
  chartData,
}: ManagerDashboardClientProps) {
  const router = useRouter();
  const [escalations, setEscalations] = useState(initialEscalations);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("due_date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(interval);
  }, [router]);

  // Sync escalations from server refresh
  useEffect(() => {
    setEscalations(initialEscalations);
  }, [initialEscalations]);

  // Resolve escalation
  async function handleResolve(escalationId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from("escalations")
      .update({ is_resolved: true })
      .eq("id", escalationId);

    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Escalation resolved");
    router.refresh();
  }

  // Filtered + sorted tasks
  const filteredTasks = useMemo(() => {
    let tasks = [...allTasks];

    if (search) {
      const q = search.toLowerCase();
      tasks = tasks.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.site_location?.toLowerCase().includes(q) ||
          unwrap(t.assigned_to_profile)?.full_name?.toLowerCase().includes(q)
      );
    }

    if (statusFilter !== "all") {
      tasks = tasks.filter((t) => t.status === statusFilter);
    }

    if (priorityFilter !== "all") {
      tasks = tasks.filter((t) => t.priority === priorityFilter);
    }

    tasks.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title);
      else if (sortKey === "due_date")
        cmp =
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      else if (sortKey === "priority") {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        cmp = order[a.priority] - order[b.priority];
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return tasks;
  }, [allTasks, search, statusFilter, priorityFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) return "";
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  // Chart formatted
  const formattedChart = chartData.map((d) => ({
    ...d,
    label: format(new Date(d.date), "EEE"),
  }));

  const statCards = [
    {
      label: "Total Tasks Today",
      value: kpis.totalToday,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Completion Rate",
      value: `${kpis.completionRate}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Overdue Tasks",
      value: kpis.overdueCount,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
      ring: kpis.overdueCount > 0 ? "ring-2 ring-red-200" : "",
      large: true,
    },
    {
      label: "Escalations",
      value: kpis.escalationCount,
      icon: ArrowUpRight,
      color: "text-orange-600",
      bg: "bg-orange-50",
      ring: kpis.escalationCount > 0 ? "ring-2 ring-orange-200" : "",
    },
    {
      label: "Pending Reviews",
      value: kpis.pendingReviews,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Operations Overview
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" className="gap-2 self-start">
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>

      {/* ── Escalation Banner ── */}
      <EscalationBanner
        total={escalations.length}
        criticalCount={
          escalations.filter((e) => {
            const reason = typeof e.reason === "string" ? e.reason : "";
            return reason.startsWith("CRITICAL:");
          }).length
        }
      />

      {/* ── KPI Stats ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {statCards.map((stat) => (
          <Card
            key={stat.label}
            className={`p-5 ${"ring" in stat && stat.ring ? stat.ring : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {stat.label}
                </p>
                <p
                  className={`font-bold text-slate-900 ${
                    "large" in stat && stat.large ? "text-3xl" : "text-2xl"
                  }`}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ── Escalations Panel ── */}
      {escalations.length > 0 && (
        <Card className="border-red-200 border-2 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-red-700">
            <AlertTriangle className="h-5 w-5" />
            Requires Your Attention
            <Badge variant="secondary" className="bg-red-100 text-red-800 ml-1">
              {escalations.length}
            </Badge>
          </h2>

          <div className="space-y-3">
            {escalations.map((esc) => {
              const task = unwrap(esc.task);
              const from = unwrap(esc.from_profile);
              const staffNested = unwrap(esc.staff_profile);
              const staff = staffNested
                ? unwrap(staffNested.assigned_to_profile)
                : null;

              return (
                <div
                  key={esc.id}
                  className="flex flex-col gap-3 rounded-lg border border-red-100 bg-red-50/40 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-semibold text-slate-900 truncate">
                      {task?.title || "Unknown task"}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-slate-600">
                      {staff && (
                        <span className="flex items-center gap-1">
                          <UserCircle className="h-3.5 w-3.5" />
                          Staff: {staff.full_name}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="h-3.5 w-3.5 text-orange-500" />
                        Escalated by: {from?.full_name || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDistanceToNow(new Date(esc.escalated_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 italic">
                      &ldquo;{esc.reason}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleResolve(esc.id)}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      Resolve
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ── Chart ── */}
      <Card className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          Tasks — Last 7 Days
        </h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={formattedChart}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  fontSize: "13px",
                }}
              />
              <Legend wrapperStyle={{ fontSize: "13px" }} />
              <Bar
                dataKey="completed"
                name="Completed"
                fill="#22c55e"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="overdue"
                name="Overdue"
                fill="#ef4444"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* ── Tasks Overview Table ── */}
      <Card className="p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Tasks Overview
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search tasks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48 pl-9 text-sm"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Priority</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("title")}
                >
                  Task{sortIndicator("title")}
                </TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Location</TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("due_date")}
                >
                  Due Date{sortIndicator("due_date")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("status")}
                >
                  Status{sortIndicator("status")}
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none"
                  onClick={() => toggleSort("priority")}
                >
                  Priority{sortIndicator("priority")}
                </TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-8 text-center text-sm text-slate-500"
                  >
                    No tasks found
                  </TableCell>
                </TableRow>
              ) : (
                filteredTasks.slice(0, 50).map((task) => {
                  const assignee = unwrap(task.assigned_to_profile);
                  const pCfg = PRIORITY_CONFIG[task.priority];
                  const sCfg = STATUS_CONFIG[task.status];

                  return (
                    <TableRow key={task.id} className="hover:bg-gray-50/50">
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {task.title}
                      </TableCell>
                      <TableCell className="text-sm">
                        {assignee?.full_name || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {task.site_location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {task.site_location}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(task.due_date), "MMM d, h:mm a")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={sCfg.color}>
                          {sCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={pCfg.color}>
                          {pCfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="text-xs">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {filteredTasks.length > 50 && (
          <p className="mt-3 text-center text-xs text-slate-500">
            Showing 50 of {filteredTasks.length} tasks
          </p>
        )}
      </Card>
    </div>
  );
}
