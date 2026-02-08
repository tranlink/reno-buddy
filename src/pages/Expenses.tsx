import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatEGP, CATEGORIES } from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";

type Expense = Tables<"expenses">;
type Partner = Tables<"partners">;

export default function Expenses() {
  const { activeProject } = useProjects();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filterMonth, setFilterMonth] = useState("__all__");
  const [filterPartner, setFilterPartner] = useState("__all__");
  const [filterCategory, setFilterCategory] = useState("__all__");
  const [filterReview, setFilterReview] = useState("__all__");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    Promise.all([
      supabase.from("expenses").select("*").eq("project_id", activeProject.id).order("date", { ascending: false }),
      supabase.from("partners").select("*").eq("project_id", activeProject.id),
    ]).then(([expRes, partRes]) => {
      setExpenses(expRes.data || []);
      setPartners(partRes.data || []);
      setLoading(false);
    });
  }, [activeProject]);

  if (!activeProject) return <p className="text-muted-foreground">Select a project.</p>;
  if (loading) return <p className="text-muted-foreground">Loading...</p>;

  // Unique months
  const months = [...new Set(expenses.map((e) => e.date.slice(0, 7)))].sort().reverse();

  let filtered = expenses;
  if (filterMonth !== "__all__") filtered = filtered.filter((e) => e.date.startsWith(filterMonth));
  if (filterPartner !== "__all__") filtered = filtered.filter((e) => e.paid_by_partner_id === filterPartner);
  if (filterCategory !== "__all__") filtered = filtered.filter((e) => e.category === filterCategory);
  if (filterReview === "review") filtered = filtered.filter((e) => (e as any).needs_review === true);
  if (filterReview === "reviewed") filtered = filtered.filter((e) => (e as any).needs_review !== true);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Expenses</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Month" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All months</SelectItem>
            {months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPartner} onValueChange={setFilterPartner}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Partner" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All partners</SelectItem>
            {partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterReview} onValueChange={setFilterReview}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue placeholder="Review" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All</SelectItem>
            <SelectItem value="review">Needs Review</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No expenses found.</p>
      ) : (
        <div className="divide-y rounded-lg border bg-card">
          {filtered.map((exp) => {
            const partner = partners.find((p) => p.id === exp.paid_by_partner_id);
            return (
              <Link key={exp.id} to={`/expenses/${exp.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{formatEGP(Number(exp.amount_egp))}</p>
                  <p className="text-xs text-muted-foreground">{exp.date} · {partner?.name || "Unknown"}{exp.category ? ` · ${exp.category}` : ""}</p>
                  {exp.notes && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{exp.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {(exp as any).needs_review && (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">⚠ Review</Badge>
                  )}
                  <Badge variant={exp.missing_receipt ? "destructive" : "secondary"} className="text-xs shrink-0">
                    {exp.missing_receipt ? "⚠️ Missing" : "✅ Receipt"}
                  </Badge>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
