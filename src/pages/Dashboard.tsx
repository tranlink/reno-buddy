import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatEGP } from "@/lib/constants";
import { PlusCircle, Download, AlertTriangle, Receipt, Calendar, DollarSign, FileWarning, Upload, Banknote, PieChart } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const PARTNER_COLORS = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500", "bg-rose-500", "bg-cyan-500"];

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

  const actualExpenses = expenses.filter(e => !e.is_fund_transfer);
  const fundTransfers = expenses.filter(e => e.is_fund_transfer);

  const totalSpend = actualExpenses.reduce((s, e) => s + Number(e.amount_egp), 0);
  const totalFunded = fundTransfers.reduce((s, e) => s + Number(e.amount_egp), 0);
  const missingReceipts = actualExpenses.filter((e) => e.missing_receipt).length;
  const needsReviewCount = actualExpenses.filter((e) => e.needs_review).length;
  const lastExpenseDate = actualExpenses.length > 0 ? actualExpenses[0].date : null;

  // Partner contributions (expenses only)
  const partnerStats = partners.map((p) => {
    const pExpenses = actualExpenses.filter((e) => e.paid_by_partner_id === p.id);
    const expensesPaid = pExpenses.reduce((s, e) => s + Number(e.amount_egp), 0);
    const pFunds = fundTransfers.filter((e) => e.paid_by_partner_id === p.id);
    const fundsSent = pFunds.reduce((s, e) => s + Number(e.amount_egp), 0);
    const totalContribution = expensesPaid + fundsSent;
    const equalShare = totalSpend / Math.max(partners.length, 1);
    const balance = totalContribution - equalShare;
    return {
      ...p,
      expensesPaid,
      fundsSent,
      totalContribution,
      equalShare,
      balance,
      count: pExpenses.length,
      share: totalSpend > 0 ? (totalContribution / totalSpend) * 100 : 0,
    };
  });

  // Category totals (expenses only)
  const catTotals: Record<string, number> = {};
  actualExpenses.forEach((e) => {
    const cat = e.category || "Uncategorized";
    catTotals[cat] = (catTotals[cat] || 0) + Number(e.amount_egp);
  });

  const recent = actualExpenses.slice(0, 10);
  const sumCheck = actualExpenses.reduce((s, e) => s + Number(e.amount_egp), 0);
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
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><DollarSign className="h-3.5 w-3.5" /> Total Spend</div>
            <p className="text-lg font-bold">{formatEGP(totalSpend)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Receipt className="h-3.5 w-3.5" /> Expenses</div>
            <p className="text-lg font-bold">{actualExpenses.length}</p>
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
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1"><Banknote className="h-3.5 w-3.5" /> Total Funded</div>
            <p className="text-lg font-bold">{formatEGP(totalFunded)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to="/add-expense"><PlusCircle className="mr-1 h-4 w-4" />Add Expense</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/import"><Upload className="mr-1 h-4 w-4" />Import WhatsApp</Link></Button>
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
                <TableHead className="text-right">Expenses Paid</TableHead>
                <TableHead className="text-right">Funds Sent</TableHead>
                <TableHead className="text-right">Total In</TableHead>
                <TableHead className="text-right">Equal Share</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerStats.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="text-right">{formatEGP(p.expensesPaid)}</TableCell>
                  <TableCell className="text-right">{p.fundsSent > 0 ? formatEGP(p.fundsSent) : "—"}</TableCell>
                  <TableCell className="text-right font-medium">{formatEGP(p.totalContribution)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatEGP(p.equalShare)}</TableCell>
                  <TableCell className={`text-right font-bold ${p.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {p.balance >= 0 ? "+" : ""}{formatEGP(p.balance)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground px-4 pb-3">
            Equal share = Total expenses ÷ {partners.length} partners.
            Green = overpaid (owed money back). Red = underpaid (owes money).
          </p>
        </CardContent>
      </Card>

      {/* Project Ownership */}
      {totalSpend > 0 ? (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PieChart className="h-4 w-4" /> Project Ownership</CardTitle></CardHeader>
          <CardContent>
            {/* Stacked bar */}
            <div className="flex h-6 rounded-full overflow-hidden mb-4">
              {[...partnerStats].sort((a, b) => b.share - a.share).map((p, i) => (
                <div
                  key={p.id}
                  className={`${PARTNER_COLORS[i % PARTNER_COLORS.length]} transition-all`}
                  style={{ width: `${p.share}%` }}
                  title={`${p.name}: ${p.share.toFixed(1)}%`}
                />
              ))}
            </div>
            {/* Per-partner rows */}
            <div className="space-y-3">
              {[...partnerStats].sort((a, b) => b.share - a.share).map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-sm font-medium w-28 truncate">{p.name}</span>
                  <div className="flex-1 h-3 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full ${PARTNER_COLORS[i % PARTNER_COLORS.length]} transition-all`}
                      style={{ width: `${p.share}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold w-16 text-right">{p.share.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><PieChart className="h-4 w-4" /> Project Ownership</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">No expenses yet</p></CardContent>
        </Card>
      )}

      {/* Fund Transfers */}
      {fundTransfers.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Fund Transfers</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {fundTransfers.map((ft) => {
                const partner = partners.find((p) => p.id === ft.paid_by_partner_id);
                return (
                  <Link key={ft.id} to={`/expenses/${ft.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{formatEGP(Number(ft.amount_egp))}</p>
                      <p className="text-xs text-muted-foreground">{ft.date} · {partner?.name || "Unknown"}</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-blue-500 text-blue-600">💰 Fund</Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

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
