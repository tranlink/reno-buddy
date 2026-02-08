import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, Check, ImageIcon, X, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { formatEGP } from "@/lib/constants";
import type { Tables } from "@/integrations/supabase/types";

type ReceiptInboxItem = Tables<"receipt_inbox">;

export default function ReceiptInbox() {
  const { activeProject } = useProjects();
  const { toast } = useToast();
  const [inboxItems, setInboxItems] = useState<ReceiptInboxItem[]>([]);
  const [expenses, setExpenses] = useState<(Tables<"expenses"> & { partner_name?: string })[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!activeProject) return;
    setLoading(true);
    const [{ data: inbox }, { data: exp }, { data: partners }] = await Promise.all([
      supabase.from("receipt_inbox").select("*").eq("project_id", activeProject.id).is("assigned_expense_id", null).order("timestamp", { ascending: false }),
      supabase.from("expenses").select("*").eq("project_id", activeProject.id).eq("missing_receipt", true).order("date", { ascending: false }),
      supabase.from("partners").select("*").eq("project_id", activeProject.id),
    ]);
    setInboxItems(inbox || []);
    const partnerMap = new Map((partners || []).map((p) => [p.id, p.name]));
    setExpenses((exp || []).map((e) => ({ ...e, partner_name: partnerMap.get(e.paid_by_partner_id) || "—" })));
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeProject]);

  const handleDismiss = async (id: string) => {
    await supabase.from("receipt_inbox").delete().eq("id", id);
    toast({ title: "Receipt dismissed" });
    fetchData();
  };

  const handleClearAll = async () => {
    if (!activeProject) return;
    const ids = inboxItems.map(i => i.id);
    if (ids.length === 0) return;
    for (const id of ids) {
      await supabase.from("receipt_inbox").delete().eq("id", id);
    }
    toast({ title: "Receipt inbox cleared", description: `${ids.length} unassigned receipts removed.` });
    fetchData();
  };

  const handleAssign = async () => {
    if (!selectedImage || !selectedExpense) return;
    const item = inboxItems.find((i) => i.id === selectedImage);
    if (!item) return;

    // Update expense: add receipt URL and set missing_receipt=false
    const expense = expenses.find((e) => e.id === selectedExpense);
    if (!expense) return;

    const newUrls = [...(expense.receipt_urls || []), item.storage_path];
    await supabase.from("expenses").update({
      receipt_urls: newUrls,
      missing_receipt: false,
    }).eq("id", selectedExpense);

    // Mark inbox item as assigned
    await supabase.from("receipt_inbox").update({
      assigned_expense_id: selectedExpense,
    }).eq("id", selectedImage);

    toast({ title: "Receipt assigned", description: "Receipt linked to expense." });
    setSelectedImage(null);
    setSelectedExpense(null);
    fetchData();
  };

  if (!activeProject) return <p className="text-muted-foreground p-4">Select a project first.</p>;

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Inbox className="h-6 w-6" /> Receipt Inbox
      </h1>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : inboxItems.length === 0 && expenses.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No unassigned receipts or expenses missing receipts.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Unassigned receipts */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Unassigned Receipts ({inboxItems.length})</CardTitle>
                <CardDescription>Click to select, then assign to an expense.</CardDescription>
              </div>
              {inboxItems.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive border-destructive hover:bg-destructive/10">
                      <Trash2 className="mr-1 h-3 w-3" /> Clear All ({inboxItems.length})
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear all unassigned receipts?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove {inboxItems.length} unassigned receipt images from the inbox. Receipts already assigned to expenses are not affected.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Clear All
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-auto">
              {inboxItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedImage(item.id)}
                  className={`group relative rounded-lg overflow-hidden border-2 transition-colors ${
                    selectedImage === item.id ? "border-primary" : "border-transparent"
                  }`}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDismiss(item.id); }}
                    className="absolute top-1 left-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    title="Dismiss (not a receipt)"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <img
                    src={item.storage_path}
                    alt={item.original_filename || "Receipt"}
                    className="w-full h-32 object-cover"
                    loading="lazy"
                  />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs p-1 truncate">
                    {item.original_filename || "Receipt"}
                  </div>
                  {selectedImage === item.id && (
                    <div className="absolute top-1 right-1">
                      <Check className="h-5 w-5 text-primary bg-white rounded-full p-0.5" />
                    </div>
                  )}
                </button>
              ))}
              {inboxItems.length === 0 && (
                <p className="col-span-2 text-sm text-muted-foreground text-center py-4">No unassigned receipts.</p>
              )}
            </CardContent>
            <p className="text-xs text-muted-foreground px-6 pb-4">
              Hover over a receipt and click × to dismiss non-receipt images.
            </p>
          </Card>

          {/* Expenses missing receipts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expenses Missing Receipts ({expenses.length})</CardTitle>
              <CardDescription>Select an expense to assign the receipt to.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] overflow-auto">
              {expenses.map((exp) => (
                <button
                  key={exp.id}
                  onClick={() => setSelectedExpense(exp.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedExpense === exp.id ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{formatEGP(Number(exp.amount_egp))}</p>
                      <p className="text-xs text-muted-foreground">{exp.date} · {exp.partner_name}</p>
                    </div>
                    <Badge variant="outline" className="text-warning border-warning text-xs">⚠️ Missing</Badge>
                  </div>
                  {exp.notes && <p className="text-xs text-muted-foreground mt-1 truncate">{exp.notes}</p>}
                </button>
              ))}
              {expenses.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No expenses missing receipts.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assignment action */}
      {(selectedImage && selectedExpense) && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <Button size="lg" onClick={handleAssign} className="shadow-lg">
            <ImageIcon className="h-4 w-4 mr-2" /> Assign Receipt to Expense
          </Button>
        </div>
      )}
    </div>
  );
}
