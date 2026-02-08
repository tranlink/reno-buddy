import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Partner = Tables<"partners">;

export default function ExportCSV() {
  const { activeProject } = useProjects();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!activeProject) return;
    setExporting(true);

    const [expRes, partRes] = await Promise.all([
      supabase.from("expenses").select("*").eq("project_id", activeProject.id).order("date", { ascending: false }),
      supabase.from("partners").select("*").eq("project_id", activeProject.id),
    ]);

    const expenses = expRes.data || [];
    const partners: Partner[] = partRes.data || [];
    const partnerMap = Object.fromEntries(partners.map((p) => [p.id, p.name]));

    const header = "Date,Amount (EGP),Paid By,Category,Notes,Has Receipt,Source,Type";
    const rows = expenses.map((e) => {
      const cols = [
        e.date,
        e.amount_egp,
        `"${partnerMap[e.paid_by_partner_id] || "Unknown"}"`,
        `"${e.category || ""}"`,
        `"${(e.notes || "").replace(/"/g, '""')}"`,
        e.missing_receipt ? "No" : "Yes",
        (e as any).source || "manual",
        (e as any).is_fund_transfer ? "Fund Transfer" : "Expense",
      ];
      return cols.join(",");
    });

    const csv = [header, ...rows].join("\n");
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProject.name.replace(/\s+/g, "_")}_expenses.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    toast({ title: "CSV exported!" });
  };

  if (!activeProject) return <p className="text-muted-foreground">Select a project.</p>;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader><CardTitle>Export Expenses</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Export all expenses for <strong>{activeProject.name}</strong> as a CSV file.
        </p>
        <p className="text-xs text-muted-foreground">
          Columns: Date, Amount (EGP), Paid By, Category, Notes, Has Receipt, Source, Type
        </p>
        <Button onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Download CSV"}
        </Button>
      </CardContent>
    </Card>
  );
}
