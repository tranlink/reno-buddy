import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { formatEGP, CATEGORIES } from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";
import { Pencil, Upload, X, Trash2, History, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Expense = Tables<"expenses">;
type Partner = Tables<"partners">;
type AuditEntry = Tables<"audit_log">;

export default function ExpenseDetail() {
  const { id } = useParams<{ id: string }>();
  const { activeProject } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // Edit form state
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [missingReceipt, setMissingReceipt] = useState(false);
  const [needsReview, setNeedsReview] = useState(false);
  const [isFund, setIsFund] = useState(false);
  const [correctionNote, setCorrectionNote] = useState("");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id || !activeProject) return;
    setLoading(true);
    Promise.all([
      supabase.from("expenses").select("*").eq("id", id).maybeSingle(),
      supabase.from("partners").select("*").eq("project_id", activeProject.id),
      supabase.from("audit_log").select("*").eq("entity_id", id).eq("entity_type", "expense").order("changed_at", { ascending: false }),
    ]).then(([expRes, partRes, auditRes]) => {
      setAuditLog(auditRes.data || []);
      const exp = expRes.data;
      setExpense(exp);
      setPartners(partRes.data || []);
      if (exp) {
        setDate(exp.date);
        setAmount(String(exp.amount_egp));
        setPaidBy(exp.paid_by_partner_id);
        setCategory(exp.category || "");
        setNotes(exp.notes || "");
        setMissingReceipt(exp.missing_receipt);
        setNeedsReview(exp.needs_review);
        setIsFund((exp as any).is_fund_transfer || false);
      }
      setLoading(false);
    });
  }, [id, activeProject]);

  const logChange = async (field: string, oldVal: string | null, newVal: string | null) => {
    if (!expense || !activeProject) return;
    await supabase.from("audit_log").insert({
      project_id: activeProject.id,
      entity_type: "expense",
      entity_id: expense.id,
      field_changed: field,
      old_value: oldVal,
      new_value: newVal,
      note: correctionNote || null,
    });
  };

  const handleSave = async () => {
    if (!expense || !activeProject) return;
    setSubmitting(true);

    // Upload new receipts
    const newUrls: string[] = [];
    for (const file of newFiles) {
      const path = `${activeProject.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
        newUrls.push(urlData.publicUrl);
      }
    }

    const updatedUrls = [...(expense.receipt_urls || []), ...newUrls];

    // Log changes
    if (date !== expense.date) await logChange("date", expense.date, date);
    if (amount !== String(expense.amount_egp)) await logChange("amount_egp", String(expense.amount_egp), amount);
    if (paidBy !== expense.paid_by_partner_id) await logChange("paid_by_partner_id", expense.paid_by_partner_id, paidBy);
    if (category !== (expense.category || "")) await logChange("category", expense.category, category || null);
    if (notes !== (expense.notes || "")) await logChange("notes", expense.notes, notes || null);
    if (missingReceipt !== expense.missing_receipt) await logChange("missing_receipt", String(expense.missing_receipt), String(missingReceipt));
    if (needsReview !== expense.needs_review) await logChange("needs_review", String(expense.needs_review), String(needsReview));
    if (isFund !== ((expense as any).is_fund_transfer || false)) await logChange("is_fund_transfer", String((expense as any).is_fund_transfer || false), String(isFund));

    const { error } = await supabase.from("expenses").update({
      date,
      amount_egp: parseFloat(amount),
      paid_by_partner_id: paidBy,
      category: category === "__none__" ? null : category || null,
      notes: notes || null,
      missing_receipt: missingReceipt,
      needs_review: needsReview,
      is_fund_transfer: isFund,
      receipt_urls: updatedUrls,
    }).eq("id", expense.id);

    setSubmitting(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Expense updated!" });
    setEditing(false);
    // Refresh
    const { data } = await supabase.from("expenses").select("*").eq("id", expense.id).maybeSingle();
    if (data) setExpense(data);
    setNewFiles([]);
    setCorrectionNote("");
  };

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (!expense) return <p className="text-muted-foreground">Expense not found.</p>;

  const partner = partners.find((p) => p.id === expense.paid_by_partner_id);

  const handleDelete = async () => {
    if (!expense || !activeProject) return;
    await supabase.from("audit_log").insert({
      project_id: activeProject.id,
      entity_type: "expense",
      entity_id: expense.id,
      field_changed: "deleted",
      old_value: JSON.stringify({ amount: expense.amount_egp, date: expense.date, paid_by: partner?.name }),
      new_value: null,
    });
    await supabase.from("import_message_hashes").delete().eq("expense_id", expense.id);
    await supabase.from("expenses").delete().eq("id", expense.id);
    toast({ title: "Expense deleted" });
    navigate("/expenses");
  };

  if (!editing) {
    return (
      <Card className="max-w-lg mx-auto">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Expense Details</CardTitle>
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="mr-1 h-3 w-3" />Edit</Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Amount</span><span className="flex items-center gap-2">{(expense as any).is_fund_transfer && <Badge variant="outline" className="border-blue-500 text-blue-600">💰 Fund Transfer</Badge>}<span className="font-bold">{formatEGP(Number(expense.amount_egp))}</span>{expense.needs_review && <Badge variant="outline" className="border-yellow-500 text-yellow-600">⚠ Needs Review</Badge>}</span></div>
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Date</span><span>{expense.date}</span></div>
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Paid By</span><span>{partner?.name || "Unknown"}</span></div>
          <div className="flex justify-between"><span className="text-sm text-muted-foreground">Category</span><span>{expense.category || "—"}</span></div>
          {expense.notes && <div><span className="text-sm text-muted-foreground">Notes</span><p className="text-sm mt-1">{expense.notes}</p></div>}
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Receipt</span>
            <Badge variant={expense.missing_receipt ? "destructive" : "secondary"}>{expense.missing_receipt ? "⚠️ Missing" : "✅ Uploaded"}</Badge>
          </div>
          {expense.receipt_urls && expense.receipt_urls.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {expense.receipt_urls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noreferrer">
                  <img src={url} alt={`Receipt ${i + 1}`} className="rounded-lg border object-cover h-32 w-full" />
                </a>
              ))}
            </div>
          )}
          {auditLog.length > 0 && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <History className="h-4 w-4" />
                View edit history ({auditLog.length} changes)
                <ChevronDown className="h-3 w-3" />
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 space-y-2">
                {auditLog.map((entry) => (
                  <div key={entry.id} className="rounded-lg border p-2 text-xs space-y-1">
                    <div>
                      <span className="font-medium">{entry.field_changed}</span>
                      {entry.old_value && <span className="text-muted-foreground"> {entry.old_value}</span>}
                      <span className="text-muted-foreground"> → </span>
                      <span>{entry.new_value || "—"}</span>
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(entry.changed_at).toLocaleString()}
                      {entry.note && ` · ${entry.note}`}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>← Back</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm"><Trash2 className="mr-1 h-3 w-3" />Delete</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this expense (EGP {Number(expense.amount_egp)}) from {expense.date}. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader><CardTitle>Edit Expense</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div><Label>Amount (EGP)</Label><Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
        </div>
        <div><Label>Paid By</Label>
          <Select value={paidBy} onValueChange={setPaidBy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Category</Label>
          <Select value={category || "__none__"} onValueChange={setCategory}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
        <div className="flex items-center gap-3">
          <Switch checked={missingReceipt} onCheckedChange={setMissingReceipt} id="missing-edit" />
          <Label htmlFor="missing-edit">Missing receipt</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={needsReview} onCheckedChange={setNeedsReview} id="needs-review-edit" />
          <Label htmlFor="needs-review-edit">Needs review</Label>
        </div>
        <div className="flex items-center gap-3">
          <Switch checked={isFund} onCheckedChange={setIsFund} id="is-fund-edit" />
          <Label htmlFor="is-fund-edit">Fund transfer</Label>
        </div>

        {/* Existing receipts */}
        {expense.receipt_urls && expense.receipt_urls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {expense.receipt_urls.map((url, i) => (
              <img key={i} src={url} alt={`Receipt ${i + 1}`} className="rounded border object-cover h-20 w-full" />
            ))}
          </div>
        )}

        {!missingReceipt && (
          <div>
            <Label>Add More Receipts</Label>
            <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground hover:bg-accent/50">
              <Upload className="h-4 w-4" /> Upload
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) setNewFiles((prev) => [...prev, ...Array.from(e.target.files!)]); }} />
            </label>
            {newFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {newFiles.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs">
                    {f.name.slice(0, 15)}<button type="button" onClick={() => setNewFiles((p) => p.filter((_, idx) => idx !== i))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div><Label>Correction Note (optional)</Label><Input value={correctionNote} onChange={(e) => setCorrectionNote(e.target.value)} placeholder="Why this change?" /></div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={submitting} className="flex-1">{submitting ? "Saving..." : "Save Changes"}</Button>
          <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </CardContent>
    </Card>
  );
}
