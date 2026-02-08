import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEGP } from "@/lib/constants";
import { PlusCircle, Download, AlertTriangle, Receipt, Calendar, DollarSign, FileWarning } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;
type Partner = Tables<"partners">;

export default function Dashboard() {
  const { activeProject } = useProjects();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject) return;
    const load = async () => {
      setLoading(true);
      const [expRes, partRes] = await Promise.all([
        supabase.from("expenses").select("*").eq("project_id", activeProject.id).order("date", { ascending: false }),
        supabase.from("partners").select("*").eq("project_id", activeProject.id).eq("active", true),
      ]);
      setExpenses(expRes.data || []);
      setPartners(partRes.data || []);
      setLoading(false);
    };
    load();
  }, [activeProject]);

  if (!activeProject) return <p className="text-muted-foreground">No project selected.</p>;
  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  const totalSpend = expenses.reduce((s, e) => s + Number(e.amount_egp), 0);
  const missingReceipts = expenses.filter((e) => e.missing_receipt).length;
  const needsReviewCount = expenses.filter((e) => (e as any).needs_review).length;
  const lastExpenseDate = expenses.length > 0 ? expenses[0].date : null;

  // Partner contributions
  const partnerStats = partners.map((p) => {
    const pExpenses = expenses.filter((e) => e.paid_by_partner_id === p.id);
    const total = pExpenses.reduce((s, e) => s + Number(e.amount_egp), 0);
    return { ...p, total, count: pExpenses.length, share: totalSpend > 0 ? (total / totalSpend) * 100 : 0 };
  });

  // Category totals
  const catTotals: Record<string, number> = {};
  expenses.forEach((e) => {
    const cat = e.category || "Uncategorized";
    catTotals[cat] = (catTotals[cat] || 0) + Number(e.amount_egp);
  });

  const recent = expenses.slice(0, 10);
  const sumCheck = expenses.reduce((s, e) => s + Number(e.amount_egp), 0);
  const integrityOk = Math.abs(sumCheck - totalSpend) < 0.01;

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div>
        <h1 className="text-2xl font-bold">{activeProject.name}</h1>
        {activeProject.description && <p className="text-muted-foreground text-sm">{activeProject.description}</p>}
        {activeProject.whatsapp_group_name && <p className="text-xs text-muted-foreground">WhatsApp: {activeProject.whatsapp_group_name}</p>}
      </div>

      {/* Summary Tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="h-3.5 w-3.5" /> Total Spend</div>
            <p className="text-lg font-bold">{formatEGP(totalSpend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Receipt className="h-3.5 w-3.5" /> Expenses</div>
            <p className="text-lg font-bold">{expenses.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><FileWarning className="h-3.5 w-3.5" /> Missing Receipts</div>
            <p className="text-lg font-bold">{missingReceipts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><AlertTriangle className="h-3.5 w-3.5" /> Needs Review</div>
            <p className="text-lg font-bold">{needsReviewCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to="/add-expense"><PlusCircle className="mr-1 h-4 w-4" />Add Expense</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/export"><Download className="mr-1 h-4 w-4" />Export CSV</Link></Button>
      </div>

      {/* Partner Contributions */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Partner Contributions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Partner</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Share</TableHead>
                <TableHead className="text-right">#</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerStats.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{formatEGP(p.total)}</TableCell>
                  <TableCell className="text-right">{p.share.toFixed(1)}%</TableCell>
                  <TableCell className="text-right">{p.count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Category Totals */}
      {Object.keys(catTotals).length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">By Category</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(catTotals).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span>{cat}</span>
                  <span className="font-medium">{formatEGP(amt)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      {recent.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Recent Expenses</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {recent.map((exp) => {
                const partner = partners.find((p) => p.id === exp.paid_by_partner_id);
                return (
                  <Link key={exp.id} to={`/expenses/${exp.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{formatEGP(Number(exp.amount_egp))}</p>
                      <p className="text-xs text-muted-foreground">{exp.date} · {partner?.name || "Unknown"}{exp.category ? ` · ${exp.category}` : ""}</p>
                    </div>
                    <Badge variant={exp.missing_receipt ? "destructive" : "secondary"} className="text-xs">
                      {exp.missing_receipt ? "⚠️ Missing" : "✅ Receipt"}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Integrity Check */}
      <div className={`flex items-center gap-2 text-xs p-3 rounded-lg ${integrityOk ? "bg-accent text-accent-foreground" : "bg-destructive/10 text-destructive"}`}>
        {!integrityOk && <AlertTriangle className="h-4 w-4" />}
        Sum of all expenses = {formatEGP(sumCheck)} {integrityOk ? "✓" : `(mismatch with total: ${formatEGP(totalSpend)})`}
      </div>
    </div>
  );
}
