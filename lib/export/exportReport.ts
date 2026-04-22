import { format } from "date-fns";

/**
 * Convert an array of objects to CSV string and trigger browser download.
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename?: string
) {
  if (data.length === 0) return;

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const fname = filename || `TaskMe_Report_${dateStr}.csv`;

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((h) => {
      const val = row[h];
      const str = val === null || val === undefined ? "" : String(val);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(values.join(","));
  }

  const csvContent = csvRows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = fname;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Create a detailed evidence log CSV for the given task IDs.
 */
export async function exportEvidenceLog(
  supabase: { from: (table: string) => any },
  taskIds: string[]
) {
  if (taskIds.length === 0) return;

  const { data: evidence } = await supabase
    .from("task_evidence")
    .select(
      `
      id,
      photo_url,
      notes,
      submitted_at,
      task:tasks!task_evidence_task_id_fkey(title, site_location),
      submitter:profiles!task_evidence_submitted_by_fkey(full_name)
    `
    )
    .in("task_id", taskIds)
    .order("submitted_at", { ascending: false });

  if (!evidence || evidence.length === 0) return;

  const rows = evidence.map(
    (e: {
      id: string;
      photo_url: string;
      notes: string | null;
      submitted_at: string;
      task: { title: string; site_location: string | null } | { title: string; site_location: string | null }[];
      submitter: { full_name: string } | { full_name: string }[];
    }) => {
      const task = Array.isArray(e.task) ? e.task[0] : e.task;
      const submitter = Array.isArray(e.submitter)
        ? e.submitter[0]
        : e.submitter;
      return {
        "Evidence ID": e.id,
        "Task Title": task?.title || "",
        "Site Location": task?.site_location || "",
        "Submitted By": submitter?.full_name || "",
        "Submitted At": e.submitted_at
          ? format(new Date(e.submitted_at), "yyyy-MM-dd HH:mm")
          : "",
        "Photo URL": e.photo_url,
        Notes: e.notes || "",
      };
    }
  );

  const dateStr = format(new Date(), "yyyy-MM-dd");
  exportToCSV(rows, `TaskMe_Evidence_Log_${dateStr}.csv`);
}
