import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CATEGORIES } from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";
import { Upload, X } from "lucide-react";

type Partner = Tables<"partners">;

export default function AddExpense() {
  const { activeProject } = useProjects();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [category, setCategory] = useState("");
  const [notes, setNotes] = useState("");
  const [missingReceipt, setMissingReceipt] = useState(false);
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeProject) return;
    supabase.from("partners").select("*").eq("project_id", activeProject.id).eq("active", true)
      .then(({ data }) => {
        setPartners(data || []);
        if (data && data.length > 0 && !paidBy) setPaidBy(data[0].id);
      });
  }, [activeProject]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setReceiptFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
  };

  const removeFile = (i: number) => setReceiptFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !paidBy || !amount) { toast({ title: "Missing fields", variant: "destructive" }); return; }
    if (!missingReceipt && receiptFiles.length === 0) {
      toast({ title: "Receipt required", description: "Upload a receipt or toggle 'Missing receipt'.", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    // Upload receipts
    const urls: string[] = [];
    for (const file of receiptFiles) {
      const path = `${activeProject.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("receipts").upload(path, file);
      if (!error) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
        urls.push(urlData.publicUrl);
      }
    }

    const { error } = await supabase.from("expenses").insert({
      project_id: activeProject.id,
      date,
      amount_egp: parseFloat(amount),
      paid_by_partner_id: paidBy,
      category: category || null,
      notes: notes || null,
      receipt_urls: urls,
      missing_receipt: missingReceipt,
    });

    setSubmitting(false);
    if (error) { toast({ title: "Error saving expense", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Expense added!" });
    navigate("/expenses");
  };

  if (!activeProject) return <p className="text-muted-foreground">Select a project first.</p>;

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader><CardTitle>Add Expense</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label>Amount (EGP)</Label><Input type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          </div>

          <div><Label>Paid By</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{partners.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div><Label>Category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div><Label>Notes (optional)</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>

          <div className="flex items-center gap-3">
            <Switch checked={missingReceipt} onCheckedChange={setMissingReceipt} id="missing" />
            <Label htmlFor="missing">Missing receipt</Label>
          </div>

          {!missingReceipt && (
            <div>
              <Label>Receipt Photos</Label>
              <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground hover:bg-accent/50 transition-colors">
                <Upload className="h-4 w-4" /> Click to upload
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              </label>
              {receiptFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {receiptFiles.map((f, i) => (
                    <span key={i} className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-xs">
                      {f.name.slice(0, 20)}
                      <button type="button" onClick={() => removeFile(i)}><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Saving..." : "Save Expense"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
