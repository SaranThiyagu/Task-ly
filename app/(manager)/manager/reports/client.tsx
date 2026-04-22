"use client";

import { useCallback, useEffect, useState } from "react";
import { format, differenceInHours, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { exportToCSV, exportEvidenceLog } from "@/lib/export/exportReport";
import { ExportButton } from "@/components/reports/ExportButton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  TrendingUp,
  Clock,
  AlertTriangle,
  Filter,
} from "lucide-react";

// ── Types ──

interface StaffOption {
  id: string;
  full_name: string;
  role: string;
}

interface StaffPerf {
  id: string;
  name: string;
  assigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
  avgHours: number;
}

interface SitePerf {
  location: string;
  total: number;
  issues: number;
  complianceRate: number;
}

interface EscalationLog {
  date: string;
  task: string;
  staff: string;
  escalatedBy: string;
  reason: string;
  resolved: boolean;
}

interface ReportsClientProps {
  staffList: StaffOption[];
  siteLocations: string[];
}

// ── Component ──

export function ReportsClient({
  staffList,
  siteLocations,
}: ReportsClientProps) {
  const supabase = createClient();

  // Filters
  const [dateFrom, setDateFrom] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [staffFilter, setStaffFilter] = useState("all");
  const [siteFilter, setSiteFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Report data
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    completionRate: 0,
    avgCompletionHours: 0,
    escalations: 0,
  });
  const [staffPerf, setStaffPerf] = useState<StaffPerf[]>([]);
  const [sitePerf, setSitePerf] = useState<SitePerf[]>([]);
  const [escalationLog, setEscalationLog] = useState<EscalationLog[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);

  // ── Fetch report data ──

  const fetchReport = useCallback(async () => {
    setLoading(true);

    const fromISO = new Date(dateFrom + "T00:00:00").toISOString();
    const toISO = new Date(dateTo + "T23:59:59").toISOString();

    // Build task query with filters
    let taskQuery = supabase
      .from("tasks")
      .select(
        "id, title, status, priority, site_location, assigned_to, due_date, completed_at, created_at"
      )
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    if (staffFilter !== "all") taskQuery = taskQuery.eq("assigned_to", staffFilter);
    if (siteFilter !== "all") taskQuery = taskQuery.eq("site_location", siteFilter);
    if (priorityFilter !== "all") taskQuery = taskQuery.eq("priority", priorityFilter);
    if (statusFilter !== "all") taskQuery = taskQuery.eq("status", statusFilter);

    const { data: tasks } = await taskQuery;
    const allTasks = tasks || [];
    setTaskIds(allTasks.map((t) => t.id));

    // Summary
    const completed = allTasks.filter((t) => t.status === "completed");
    const completionTimes = completed
      .filter((t) => t.completed_at && t.created_at)
      .map((t) =>
        differenceInHours(new Date(t.completed_at!), new Date(t.created_at))
      );
    const avgHours =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    // Escalations in period
    const { data: escalations } = await supabase
      .from("escalations")
      .select(
        "id, reason, escalated_at, is_resolved, task:tasks!escalations_task_id_fkey(title, assigned_to), from_profile:profiles!escalations_escalated_from_fkey(full_name)"
      )
      .gte("escalated_at", fromISO)
      .lte("escalated_at", toISO);

    const escList = escalations || [];

    setSummary({
      total: allTasks.length,
      completionRate:
        allTasks.length > 0
          ? Math.round((completed.length / allTasks.length) * 100)
          : 0,
      avgCompletionHours: Math.round(avgHours * 10) / 10,
      escalations: escList.length,
    });

    // Staff performance
    const staffMap = new Map<
      string,
      { assigned: number; completed: number; overdue: number; totalHours: number; hoursCount: number }
    >();

    for (const t of allTasks) {
      const sid = t.assigned_to as string;
      if (!staffMap.has(sid)) {
        staffMap.set(sid, { assigned: 0, completed: 0, overdue: 0, totalHours: 0, hoursCount: 0 });
      }
      const s = staffMap.get(sid)!;
      s.assigned++;
      if (t.status === "completed") {
        s.completed++;
        if (t.completed_at && t.created_at) {
          s.totalHours += differenceInHours(
            new Date(t.completed_at),
            new Date(t.created_at)
          );
          s.hoursCount++;
        }
      }
      if (t.status === "overdue") s.overdue++;
    }

    const staffPerfArr: StaffPerf[] = [];
    staffMap.forEach((val, key) => {
      const member = staffList.find((s) => s.id === key);
      staffPerfArr.push({
        id: key,
        name: member?.full_name || "Unknown",
        assigned: val.assigned,
        completed: val.completed,
        overdue: val.overdue,
        completionRate:
          val.assigned > 0
            ? Math.round((val.completed / val.assigned) * 100)
            : 0,
        avgHours:
          val.hoursCount > 0
            ? Math.round((val.totalHours / val.hoursCount) * 10) / 10
            : 0,
      });
    });
    staffPerfArr.sort((a, b) => b.completionRate - a.completionRate);
    setStaffPerf(staffPerfArr);

    // Site performance
    const siteMap = new Map<string, { total: number; issues: number }>();
    for (const t of allTasks) {
      const loc = (t.site_location as string) || "Unknown";
      if (!siteMap.has(loc)) siteMap.set(loc, { total: 0, issues: 0 });
      const s = siteMap.get(loc)!;
      s.total++;
      if (t.status === "overdue" || t.status === "rejected") s.issues++;
    }
    const sitePerfArr: SitePerf[] = [];
    siteMap.forEach((val, key) => {
      sitePerfArr.push({
        location: key,
        total: val.total,
        issues: val.issues,
        complianceRate:
          val.total > 0
            ? Math.round(((val.total - val.issues) / val.total) * 100)
            : 100,
      });
    });
    sitePerfArr.sort((a, b) => a.complianceRate - b.complianceRate);
    setSitePerf(sitePerfArr);

    // Escalation log
    const escLog: EscalationLog[] = escList.map(
      (e: {
        escalated_at: string;
        reason: string;
        is_resolved: boolean;
        task: { title: string; assigned_to: string } | { title: string; assigned_to: string }[];
        from_profile: { full_name: string } | { full_name: string }[];
      }) => {
        const task = Array.isArray(e.task) ? e.task[0] : e.task;
        const from = Array.isArray(e.from_profile)
          ? e.from_profile[0]
          : e.from_profile;
        const staffName =
          staffList.find((s) => s.id === task?.assigned_to)?.full_name ||
          "Unknown";
        return {
          date: format(new Date(e.escalated_at), "MMM d, yyyy HH:mm"),
          task: task?.title || "Unknown",
          staff: staffName,
          escalatedBy: from?.full_name || "System",
          reason: e.reason,
          resolved: e.is_resolved,
        };
      }
    );
    setEscalationLog(escLog);

    setLoading(false);
  }, [dateFrom, dateTo, staffFilter, siteFilter, priorityFilter, statusFilter, staffList, supabase]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // ── Export handlers ──

  async function handleExportCSV() {
    const rows = staffPerf.map((s) => ({
      "Staff Name": s.name,
      "Tasks Assigned": s.assigned,
      Completed: s.completed,
      Overdue: s.overdue,
      "Completion Rate (%)": s.completionRate,
      "Avg Hours": s.avgHours,
    }));
    exportToCSV(rows);
  }

  async function handleExportEvidence() {
    await exportEvidenceLog(supabase, taskIds);
  }

  function handlePrintView() {
    window.print();
  }

  // ── Render ──

  const summaryCards = [
    {
      label: "Total Tasks",
      value: summary.total,
      icon: ClipboardList,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Completion Rate",
      value: `${summary.completionRate}%`,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Avg Completion Time",
      value: `${summary.avgCompletionHours}h`,
      icon: Clock,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Escalations",
      value: summary.escalations,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div className="space-y-8 print:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Reports &amp; Export
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate and export task performance reports
          </p>
        </div>
        <ExportButton
          onExportCSV={handleExportCSV}
          onExportEvidence={handleExportEvidence}
          onPrintView={handlePrintView}
        />
      </div>

      {/* Filters */}
      <Card className="p-5 print:hidden">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">Filters</h3>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Site Location</Label>
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Sites</option>
              {siteLocations.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Staff Member</Label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Staff</option>
              {staffList
                .filter((s) => s.role === "staff")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Priority</Label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Status</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {summaryCards.map((stat) => (
              <Card key={stat.label} className="p-5">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2.5 ${stat.bg}`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-slate-900">
                      {stat.value}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Staff Performance Table */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Staff Performance
            </h2>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>Staff Name</TableHead>
                    <TableHead className="text-right">Assigned</TableHead>
                    <TableHead className="text-right">Completed</TableHead>
                    <TableHead className="text-right">Overdue</TableHead>
                    <TableHead className="text-right">
                      Completion Rate
                    </TableHead>
                    <TableHead className="text-right">
                      Avg Time (hrs)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffPerf.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-slate-500"
                      >
                        No data for selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    staffPerf.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">
                          {s.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.assigned}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.completed}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.overdue > 0 ? (
                            <span className="text-red-600 font-medium">
                              {s.overdue}
                            </span>
                          ) : (
                            s.overdue
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="secondary"
                            className={
                              s.completionRate >= 80
                                ? "bg-green-100 text-green-800"
                                : s.completionRate >= 50
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {s.completionRate}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {s.avgHours}h
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Site Performance Table */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Site Performance
            </h2>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>Site Location</TableHead>
                    <TableHead className="text-right">Total Tasks</TableHead>
                    <TableHead className="text-right">Issues</TableHead>
                    <TableHead className="text-right">
                      Compliance Rate
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sitePerf.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="py-8 text-center text-sm text-slate-500"
                      >
                        No data for selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    sitePerf.map((s) => (
                      <TableRow key={s.location}>
                        <TableCell className="font-medium">
                          {s.location}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.total}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.issues > 0 ? (
                            <span className="text-red-600 font-medium">
                              {s.issues}
                            </span>
                          ) : (
                            s.issues
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="secondary"
                            className={
                              s.complianceRate >= 90
                                ? "bg-green-100 text-green-800"
                                : s.complianceRate >= 70
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {s.complianceRate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Escalation Log */}
          <Card className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-slate-900">
              Escalation Log
            </h2>
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead>Date</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Escalated By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Resolved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {escalationLog.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="py-8 text-center text-sm text-slate-500"
                      >
                        No escalations in selected period
                      </TableCell>
                    </TableRow>
                  ) : (
                    escalationLog.map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {e.date}
                        </TableCell>
                        <TableCell className="font-medium max-w-[160px] truncate">
                          {e.task}
                        </TableCell>
                        <TableCell className="text-sm">{e.staff}</TableCell>
                        <TableCell className="text-sm">
                          {e.escalatedBy}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500 max-w-[200px] truncate">
                          {e.reason}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              e.resolved
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }
                          >
                            {e.resolved ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
