"use client";

import { useCallback, useEffect, useState } from "react";
import { format, differenceInHours, subDays } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  RefreshCw,
} from "lucide-react";

interface StaffOption {
  id: string;
  full_name: string;
}

interface StaffPerf {
  id: string;
  name: string;
  assigned: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

interface ReportsClientProps {
  staffList: StaffOption[];
  siteLocations: string[];
}

export function SupervisorReportsClient({
  staffList,
  siteLocations,
}: ReportsClientProps) {
  const supabase = createClient();

  const [dateFrom, setDateFrom] = useState(
    format(subDays(new Date(), 30), "yyyy-MM-dd")
  );
  const [dateTo, setDateTo] = useState(format(new Date(), "yyyy-MM-dd"));
  const [staffFilter, setStaffFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    total: 0,
    completionRate: 0,
    avgCompletionHours: 0,
    overdue: 0,
  });
  const [staffPerf, setStaffPerf] = useState<StaffPerf[]>([]);

  const fetchReport = useCallback(async () => {
    setLoading(true);

    const fromISO = new Date(dateFrom + "T00:00:00").toISOString();
    const toISO = new Date(dateTo + "T23:59:59").toISOString();

    let taskQuery = supabase
      .from("tasks")
      .select(
        "id, title, status, priority, site_location, assigned_to, due_date, completed_at, created_at"
      )
      .gte("created_at", fromISO)
      .lte("created_at", toISO);

    if (staffFilter !== "all")
      taskQuery = taskQuery.eq("assigned_to", staffFilter);
    if (statusFilter !== "all")
      taskQuery = taskQuery.eq("status", statusFilter);

    const { data: tasks } = await taskQuery;
    const allTasks = tasks || [];

    const completed = allTasks.filter((t) => t.status === "completed");
    const overdue = allTasks.filter((t) => t.status === "overdue");
    const completionTimes = completed
      .filter((t) => t.completed_at && t.created_at)
      .map((t) =>
        differenceInHours(new Date(t.completed_at!), new Date(t.created_at))
      );
    const avgHours =
      completionTimes.length > 0
        ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
        : 0;

    setSummary({
      total: allTasks.length,
      completionRate:
        allTasks.length > 0
          ? Math.round((completed.length / allTasks.length) * 100)
          : 0,
      avgCompletionHours: Math.round(avgHours * 10) / 10,
      overdue: overdue.length,
    });

    // Staff performance
    const staffMap = new Map<
      string,
      { assigned: number; completed: number; overdue: number }
    >();

    for (const t of allTasks) {
      const sid = t.assigned_to as string;
      if (!staffMap.has(sid)) {
        staffMap.set(sid, { assigned: 0, completed: 0, overdue: 0 });
      }
      const s = staffMap.get(sid)!;
      s.assigned++;
      if (t.status === "completed") s.completed++;
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
      });
    });

    setStaffPerf(staffPerfArr.sort((a, b) => b.assigned - a.assigned));
    setLoading(false);
  }, [supabase, dateFrom, dateTo, staffFilter, statusFilter, staffList]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const statCards = [
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
      label: "Avg. Hours",
      value: summary.avgCompletionHours,
      icon: Clock,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Overdue",
      value: summary.overdue,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">
            Team performance overview
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReport}
          disabled={loading}
        >
          <RefreshCw
            className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">Filters</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs text-slate-500">From</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">To</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500">Staff</Label>
            <select
              value={staffFilter}
              onChange={(e) => setStaffFilter(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All Staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-slate-500">Status</Label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((stat) => (
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
                  {loading ? "—" : stat.value}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Staff Performance Table */}
      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-slate-900">
            Staff Performance
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead className="text-center">Assigned</TableHead>
              <TableHead className="text-center">Completed</TableHead>
              <TableHead className="text-center">Overdue</TableHead>
              <TableHead className="text-center">Completion Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Loading...
                </TableCell>
              </TableRow>
            ) : staffPerf.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  No data for the selected period
                </TableCell>
              </TableRow>
            ) : (
              staffPerf.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-center">{s.assigned}</TableCell>
                  <TableCell className="text-center">{s.completed}</TableCell>
                  <TableCell className="text-center">
                    {s.overdue > 0 ? (
                      <Badge variant="destructive" className="text-xs">
                        {s.overdue}
                      </Badge>
                    ) : (
                      0
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant="outline"
                      className={
                        s.completionRate >= 80
                          ? "text-green-700 border-green-200 bg-green-50"
                          : s.completionRate >= 50
                          ? "text-yellow-700 border-yellow-200 bg-yellow-50"
                          : "text-red-700 border-red-200 bg-red-50"
                      }
                    >
                      {s.completionRate}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
