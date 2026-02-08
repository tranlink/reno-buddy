import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;
type Partner = Tables<"partners">;

function csvVal(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildFullCSV(expenses: Expense[], partners: Partner[], projectName: string): string {
  const partnerMap = Object.fromEntries(partners.map((p) => [p.id, p.name]));

  const actualExpenses = expenses.filter((e) => !e.is_fund_transfer);
  const fundTransfers = expenses.filter((e) => e.is_fund_transfer);

  const totalSpend = actualExpenses.reduce((s, e) => s + Number(e.amount_egp), 0);

  // --- Section 1: All Expenses ---
  const lines: string[] = [];
  lines.push("=== EXPENSES ===");
  lines.push("Date,Amount (EGP),Paid By,Category,Notes,Has Receipt,Needs Review,Source,Type");
  expenses.forEach((e) => {
    lines.push([
      csvVal(e.date),
      csvVal(e.amount_egp),
      csvVal(partnerMap[e.paid_by_partner_id] || "Unknown"),
      csvVal(e.category),
      csvVal(e.notes),
      e.missing_receipt ? "No" : "Yes",
      e.needs_review ? "Yes" : "No",
      csvVal(e.source),
      e.is_fund_transfer ? "Fund Transfer" : "Expense",
    ].join(","));
  });

  // --- Section 2: Partner Summary ---
  lines.push("");
  lines.push("=== PARTNER SUMMARY ===");
  lines.push("Partner,Expenses Paid,Funds Sent,Total In,Equal Share,Balance,Ownership %");

  const partnerStats = partners.map((p) => {
    const pExpenses = actualExpenses.filter((e) => e.paid_by_partner_id === p.id);
    const expensesPaid = pExpenses.reduce((s, e) => s + Number(e.amount_egp), 0);
    const pFunds = fundTransfers.filter((e) => e.paid_by_partner_id === p.id);
    const fundsSent = pFunds.reduce((s, e) => s + Number(e.amount_egp), 0);
    const totalContribution = expensesPaid + fundsSent;
    const equalShare = totalSpend / Math.max(partners.length, 1);
    const balance = totalContribution - equalShare;
    const share = totalSpend > 0 ? (totalContribution / totalSpend) * 100 : 0;
    return { name: p.name, expensesPaid, fundsSent, totalContribution, equalShare, balance, share };
  });

  partnerStats.forEach((p) => {
    lines.push([
      csvVal(p.name),
      csvVal(p.expensesPaid.toFixed(2)),
      csvVal(p.fundsSent.toFixed(2)),
      csvVal(p.totalContribution.toFixed(2)),
      csvVal(p.equalShare.toFixed(2)),
      csvVal(p.balance.toFixed(2)),
      csvVal(p.share.toFixed(1) + "%"),
    ].join(","));
  });

  // --- Section 3: Settlement ---
  lines.push("");
  lines.push("=== SETTLEMENT ===");
  lines.push("From,To,Amount (EGP)");

  const debtors = partnerStats.filter((p) => p.balance < 0).map((p) => ({ name: p.name, amount: Math.abs(p.balance) })).sort((a, b) => b.amount - a.amount);
  const creditors = partnerStats.filter((p) => p.balance > 0).map((p) => ({ name: p.name, amount: p.balance })).sort((a, b) => b.amount - a.amount);

  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    if (transfer > 0.01) {
      lines.push([csvVal(debtors[i].name), csvVal(creditors[j].name), csvVal(transfer.toFixed(2))].join(","));
    }
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  // --- Section 4: Category Breakdown ---
  lines.push("");
  lines.push("=== CATEGORY BREAKDOWN ===");
  lines.push("Category,Total (EGP),% of Spend");

  const catTotals: Record<string, number> = {};
  actualExpenses.forEach((e) => {
    const cat = e.category || "Uncategorized";
    catTotals[cat] = (catTotals[cat] || 0) + Number(e.amount_egp);
  });

  Object.entries(catTotals).sort((a, b) => b[1] - a[1]).forEach(([cat, amt]) => {
    const pct = totalSpend > 0 ? ((amt / totalSpend) * 100).toFixed(1) + "%" : "0%";
    lines.push([csvVal(cat), csvVal(amt.toFixed(2)), csvVal(pct)].join(","));
  });

  // --- Section 5: Totals ---
  lines.push("");
  lines.push("=== TOTALS ===");
  lines.push(`Total Expenses,${totalSpend.toFixed(2)}`);
  lines.push(`Total Fund Transfers,${fundTransfers.reduce((s, e) => s + Number(e.amount_egp), 0).toFixed(2)}`);
  lines.push(`Expense Count,${actualExpenses.length}`);
  lines.push(`Fund Transfer Count,${fundTransfers.length}`);
  lines.push(`Partners,${partners.length}`);
  lines.push(`Project,${csvVal(projectName)}`);

  return lines.join("\n");
}

export default function ExportCSV() {
  const { activeProject } = useProjects();
  const { toast } = useToast();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!activeProject) return;
    setExporting(true);

    const [expRes, partRes] = await Promise.all([
      supabase.from("expenses").select("*").eq("project_id", activeProject.id).order("date", { ascending: false }),
      supabase.from("partners").select("*").eq("project_id", activeProject.id).eq("active", true),
    ]);

    const csv = buildFullCSV(expRes.data || [], partRes.data || [], activeProject.name);
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProject.name.replace(/\s+/g, "_")}_full_report.csv`;
    a.click();
    URL.revokeObjectURL(url);

    setExporting(false);
    toast({ title: "Full report exported!" });
  };

  if (!activeProject) return <p className="text-muted-foreground">Select a project.</p>;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader><CardTitle>Export Full Report</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Export a complete report for <strong>{activeProject.name}</strong> including all expenses, partner shares, settlement summary, and category breakdown.
        </p>
        <p className="text-xs text-muted-foreground">
          Sections: Expenses · Partner Summary · Settlement · Categories · Totals
        </p>
        <Button onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? "Exporting..." : "Download Full Report"}
        </Button>
      </CardContent>
    </Card>
  );
}
