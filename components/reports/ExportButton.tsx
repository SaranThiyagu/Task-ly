"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, FileText, Printer, Loader2 } from "lucide-react";

interface ExportButtonProps {
  onExportCSV: () => Promise<void> | void;
  onExportEvidence: () => Promise<void> | void;
  onPrintView: () => void;
}

export function ExportButton({
  onExportCSV,
  onExportEvidence,
  onPrintView,
}: ExportButtonProps) {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(key: string, fn: () => Promise<void> | void) {
    setLoading(key);
    try {
      await fn();
    } finally {
      setLoading(null);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" className="gap-2">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Export
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleAction("csv", onExportCSV)}
          disabled={loading !== null}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleAction("evidence", onExportEvidence)}
          disabled={loading !== null}
        >
          <FileText className="mr-2 h-4 w-4" />
          Export Evidence Log
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onPrintView()}
          disabled={loading !== null}
        >
          <Printer className="mr-2 h-4 w-4" />
          Print View
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
