"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Inbox,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface StaffMember {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

interface TaskSummary {
  assigned_to: string;
  status: string;
}

interface TeamClientProps {
  staffMembers: StaffMember[];
  taskSummaries: TaskSummary[];
}

function getInitial(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function TeamClient({
  staffMembers: initialStaff,
  taskSummaries: initialSummaries,
}: TeamClientProps) {
  const router = useRouter();
  const [staffMembers] = useState(initialStaff);
  const [taskSummaries, setTaskSummaries] = useState(initialSummaries);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("supervisor-team")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  useEffect(() => {
    setTaskSummaries(initialSummaries);
  }, [initialSummaries]);

  function getStaffStats(staffId: string) {
    const staffTasks = taskSummaries.filter((t) => t.assigned_to === staffId);
    return {
      total: staffTasks.length,
      active: staffTasks.filter(
        (t) => t.status === "pending" || t.status === "in_progress"
      ).length,
      completed: staffTasks.filter((t) => t.status === "completed").length,
      overdue: staffTasks.filter((t) => t.status === "overdue").length,
    };
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Team</h1>
        <p className="mt-1 text-sm text-slate-500">
          {staffMembers.length} team member{staffMembers.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Team members */}
      {staffMembers.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 mb-4">
            <Inbox className="h-7 w-7 text-slate-300" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            No team members
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-xs">
            Staff members will appear here once added to the system
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {staffMembers.map((member) => {
            const stats = getStaffStats(member.id);
            return (
              <Card key={member.id} className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    {getInitial(member.full_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">
                      {member.full_name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col items-center rounded-lg bg-blue-50 p-2">
                    <ClipboardList className="h-4 w-4 text-blue-600 mb-0.5" />
                    <span className="text-lg font-bold text-slate-900">
                      {stats.active}
                    </span>
                    <span className="text-[10px] text-slate-500">Active</span>
                  </div>
                  <div className="flex flex-col items-center rounded-lg bg-green-50 p-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mb-0.5" />
                    <span className="text-lg font-bold text-slate-900">
                      {stats.completed}
                    </span>
                    <span className="text-[10px] text-slate-500">Done</span>
                  </div>
                  <div className="flex flex-col items-center rounded-lg bg-red-50 p-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 mb-0.5" />
                    <span className="text-lg font-bold text-slate-900">
                      {stats.overdue}
                    </span>
                    <span className="text-[10px] text-slate-500">Overdue</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
