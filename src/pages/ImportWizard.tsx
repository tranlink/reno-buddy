import { useState, useCallback, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { parseChat } from "@/lib/whatsappParser";
import type { ParsedMessage } from "@/lib/whatsappParser";
import type { Tables } from "@/integrations/supabase/types";
import UploadStep from "@/components/import/UploadStep";
import SenderMappingStep from "@/components/import/SenderMappingStep";
import PreviewStep, { type MessageRow } from "@/components/import/PreviewStep";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Partner = Tables<"partners">;

export default function ImportWizard() {
  const { activeProject } = useProjects();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [mediaFiles, setMediaFiles] = useState<Map<string, File>>(new Map());
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [senders, setSenders] = useState<string[]>([]);
  const [senderMapping, setSenderMapping] = useState<Map<string, { partnerId: string | null; ignored: boolean }>>(new Map());
  const [existingMappings, setExistingMappings] = useState<Map<string, { partnerId: string | null; ignored: boolean }>>(new Map());
  const [partners, setPartners] = useState<Partner[]>([]);
  const [previewRows, setPreviewRows] = useState<MessageRow[]>([]);
  const [duplicateHashes, setDuplicateHashes] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<{ expenses: number; receipts: number; inbox: number } | null>(null);

  // Load partners and existing sender mappings
  useEffect(() => {
    if (!activeProject) return;
    const load = async () => {
      const [{ data: p }, { data: m }] = await Promise.all([
        supabase.from("partners").select("*").eq("project_id", activeProject.id),
        supabase.from("sender_mappings").select("*").eq("project_id", activeProject.id),
      ]);
      setPartners(p || []);
      const map = new Map<string, { partnerId: string | null; ignored: boolean }>();
      (m || []).forEach((sm) => map.set(sm.whatsapp_name, { partnerId: sm.partner_id, ignored: sm.ignored || false }));
      setExistingMappings(map);
    };
    load();
  }, [activeProject]);

  // Step 1 complete
  const handleUploadComplete = useCallback((text: string, files: Map<string, File>) => {
    setMediaFiles(files);
    const parsed = parseChat(text);
    setMessages(parsed);
    const uniqueSenders = [...new Set(parsed.map((m) => m.sender))];
    setSenders(uniqueSenders);
    setStep(2);
  }, []);

  // Step 2 complete
  const handleMappingComplete = useCallback(async (mapping: Map<string, { partnerId: string | null; ignored: boolean }>) => {
    setSenderMapping(mapping);
    if (!activeProject) return;

    // Save mappings to DB
    const upserts = Array.from(mapping.entries()).map(([name, val]) => ({
      project_id: activeProject.id,
      whatsapp_name: name,
      partner_id: val.partnerId,
      ignored: val.ignored,
    }));
    for (const u of upserts) {
      await supabase.from("sender_mappings").upsert(u, { onConflict: "project_id,whatsapp_name" });
    }

    // Build preview rows from non-ignored senders
    const getPartnerName = (id: string | null) => partners.find((p) => p.id === id)?.name || "—";

    const filtered = messages.filter((m) => {
      const map = mapping.get(m.sender);
      return map && !map.ignored && map.partnerId;
    });

    const rows: MessageRow[] = filtered.map((m, idx) => {
      const map = mapping.get(m.sender)!;
      return {
        id: idx,
        date: m.date,
        time: m.time,
        sender: m.sender,
        partnerName: getPartnerName(map.partnerId),
        partnerId: map.partnerId!,
        text: m.text,
        hasMedia: m.hasMedia,
        mediaFilename: m.mediaFilename,
        selected: false,
        amount: "",
        category: "",
        hash: m.hash,
      };
    });

    // Check duplicates
    const hashes = rows.map((r) => r.hash);
    if (hashes.length > 0) {
      const { data: existing } = await supabase
        .from("import_message_hashes")
        .select("message_hash")
        .eq("project_id", activeProject.id)
        .in("message_hash", hashes);
      setDuplicateHashes(new Set((existing || []).map((e) => e.message_hash)));
    } else {
      setDuplicateHashes(new Set());
    }

    setPreviewRows(rows);
    setStep(3);
  }, [activeProject, messages, partners]);

  // Step 3: Import
  const handleImport = useCallback(async (selectedRows: MessageRow[]) => {
    if (!activeProject) return;

    const { data: run, error: runErr } = await supabase
      .from("import_runs")
      .insert({
        project_id: activeProject.id,
        user_id: (await supabase.auth.getUser()).data.user!.id,
        filename: "WhatsApp Export",
      })
      .select()
      .single();

    if (runErr || !run) {
      toast({ title: "Error", description: "Failed to create import run.", variant: "destructive" });
      return;
    }

    let receiptsLinked = 0;

    for (const row of selectedRows) {
      const amountEgp = parseFloat(row.amount) || 0;

      const { data: expense } = await supabase.from("expenses").insert({
        project_id: activeProject.id,
        date: row.date,
        amount_egp: amountEgp,
        paid_by_partner_id: row.partnerId,
        category: row.category || null,
        notes: row.text,
        receipt_urls: [],
        missing_receipt: !row.hasMedia,
        needs_review: true,
        is_fund_transfer: false,
        source: "whatsapp_import",
      }).select().single();

      if (expense) {
        await supabase.from("import_message_hashes").insert({
          project_id: activeProject.id,
          message_hash: row.hash,
          expense_id: expense.id,
          import_run_id: run.id,
        });
        if (row.hasMedia) receiptsLinked++;
      }
    }

    // Send ALL media files from ZIP to receipt inbox
    const imageFiles = Array.from(mediaFiles.entries()).filter(
      ([fn]) => /\.(jpg|jpeg|png|webp)$/i.test(fn)
    );

    for (const [fn, file] of imageFiles) {
      const path = `${activeProject.id}/inbox/${crypto.randomUUID()}-${fn}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
        // Find the message that referenced this file for metadata
        const relatedMsg = messages.find((m) => m.mediaFilename === fn);
        await supabase.from("receipt_inbox").insert({
          project_id: activeProject.id,
          import_run_id: run.id,
          storage_path: urlData.publicUrl,
          original_filename: fn,
          whatsapp_sender: relatedMsg?.sender || null,
          timestamp: relatedMsg ? `${relatedMsg.date}T${relatedMsg.time}` : null,
        });
      }
    }

    await supabase.from("import_runs").update({
      expenses_imported: selectedRows.length,
      receipts_matched: 0,
      receipts_unmatched: imageFiles.length,
    }).eq("id", run.id);

    setImportResult({
      expenses: selectedRows.length,
      receipts: receiptsLinked,
      inbox: imageFiles.length,
    });
    setStep(4);
    toast({ title: "Import complete", description: `${selectedRows.length} expenses imported.` });
  }, [activeProject, mediaFiles, messages, toast]);

  if (!activeProject) return <p className="text-muted-foreground p-4">Select a project first.</p>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Import from WhatsApp</h1>

      {/* Step indicators */}
      <div className="flex gap-2 text-sm">
        {["Upload ZIP", "Map Senders", "Preview", "Done"].map((label, i) => (
          <div key={i} className={`px-3 py-1 rounded-full text-xs font-medium ${
            step === i + 1 ? "bg-primary text-primary-foreground" :
            step > i + 1 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          }`}>{i + 1}. {label}</div>
        ))}
      </div>

      {step === 1 && <UploadStep onComplete={handleUploadComplete} />}
      {step === 2 && (
        <SenderMappingStep
          senders={senders}
          partners={partners}
          existingMappings={existingMappings}
          onComplete={handleMappingComplete}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <PreviewStep
          rows={previewRows}
          onRowsChange={setPreviewRows}
          duplicateHashes={duplicateHashes}
          onImport={handleImport}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && importResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-success">
              <CheckCircle2 className="h-5 w-5" /> Import Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{importResult.expenses} expenses imported</p>
            {importResult.inbox > 0 && (
              <p className="text-sm">{importResult.inbox} photos sent to receipt inbox for manual assignment</p>
            )}
            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => navigate("/receipt-inbox")}>
                Go to Receipt Inbox
              </Button>
              <Button onClick={() => navigate("/expenses")}>View Expenses</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
