import { useState, useCallback } from "react";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { parseChat, detectExpenses, matchReceiptsToExpenses } from "@/lib/whatsappParser";
import type { ParsedMessage, MediaEvent, ExpenseCandidate } from "@/lib/whatsappParser";
import type { ReceiptMatch } from "@/lib/whatsappParser";
import type { Tables } from "@/integrations/supabase/types";
import UploadStep from "@/components/import/UploadStep";
import SenderMappingStep from "@/components/import/SenderMappingStep";
import PreviewStep, { type PreviewRow } from "@/components/import/PreviewStep";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

type Partner = Tables<"partners">;

export default function ImportWizard() {
  const { activeProject } = useProjects();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [chatText, setChatText] = useState("");
  const [mediaFiles, setMediaFiles] = useState<Map<string, File>>(new Map());
  const [messages, setMessages] = useState<ParsedMessage[]>([]);
  const [mediaEvents, setMediaEvents] = useState<MediaEvent[]>([]);
  const [senders, setSenders] = useState<string[]>([]);
  const [candidates, setCandidates] = useState<ExpenseCandidate[]>([]);
  const [receiptMatches, setReceiptMatches] = useState<Map<number, ReceiptMatch | null>>(new Map());
  const [duplicateHashes, setDuplicateHashes] = useState<Set<string>>(new Set());
  const [senderMapping, setSenderMapping] = useState<Map<string, { partnerId: string | null; ignored: boolean }>>(new Map());
  const [existingMappings, setExistingMappings] = useState<Map<string, { partnerId: string | null; ignored: boolean }>>(new Map());
  const [partners, setPartners] = useState<Partner[]>([]);
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
    setChatText(text);
    setMediaFiles(files);
    const { messages: msgs, mediaEvents: events } = parseChat(text);
    setMessages(msgs);
    setMediaEvents(events);
    const uniqueSenders = [...new Set(msgs.map((m) => m.sender))];
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

    // Detect expenses (only from non-ignored senders)
    const filtered = messages.filter((m) => {
      const map = mapping.get(m.sender);
      return map && !map.ignored && map.partnerId;
    });
    const detected = detectExpenses(filtered);
    setCandidates(detected);

    // Check duplicates
    const hashes = detected.map((c) => c.message.hash);
    const { data: existing } = await supabase
      .from("import_message_hashes")
      .select("message_hash")
      .eq("project_id", activeProject.id)
      .in("message_hash", hashes);
    const dupes = new Set((existing || []).map((e) => e.message_hash));
    setDuplicateHashes(dupes);

    // Match receipts
    const senderToPartnerName = new Map<string, string>();
    mapping.forEach((val, sender) => {
      if (val.partnerId) {
        const p = partners.find((pp) => pp.id === val.partnerId);
        if (p) senderToPartnerName.set(sender, p.name);
      }
    });
    const matches = matchReceiptsToExpenses(detected, mediaEvents, mediaFiles, senderToPartnerName);
    setReceiptMatches(matches);

    setStep(3);
  }, [activeProject, messages, mediaEvents, mediaFiles, partners]);

  // Step 3: Import
  const handleImport = useCallback(async (rows: PreviewRow[]) => {
    if (!activeProject) return;

    // Create import run
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

    let receiptsMatched = 0;
    let receiptsUnmatched = 0;

    for (const row of rows) {
      const receiptUrls: string[] = [];
      let missingReceipt = true;

      // Upload receipt if matched
      if (row.receiptMatch) {
        const file = mediaFiles.get(row.receiptMatch.mediaFilename);
        if (file) {
          const path = `${activeProject.id}/${crypto.randomUUID()}-${file.name}`;
          const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
          if (!upErr) {
            const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
            receiptUrls.push(urlData.publicUrl);
            missingReceipt = false;
            receiptsMatched++;
          }
        }
      } else {
        receiptsUnmatched++;
      }

      // Insert expense
      const { data: expense } = await supabase.from("expenses").insert({
        project_id: activeProject.id,
        date: row.candidate.message.timestamp.toISOString().split("T")[0],
        amount_egp: row.amountEgp,
        paid_by_partner_id: row.mappedPartnerId!,
        category: row.category || null,
        notes: row.candidate.message.notes || row.candidate.message.text,
        receipt_urls: receiptUrls,
        missing_receipt: missingReceipt,
      }).select().single();

      // Store hash
      if (expense) {
        await supabase.from("import_message_hashes").insert({
          project_id: activeProject.id,
          message_hash: row.candidate.message.hash,
          expense_id: expense.id,
          import_run_id: run.id,
        });
      }
    }

    // Send unmatched media to receipt inbox
    const usedMedia = new Set(rows.filter((r) => r.receiptMatch).map((r) => r.receiptMatch!.mediaFilename));
    const unmatchedMedia = Array.from(mediaFiles.entries()).filter(
      ([fn]) => !usedMedia.has(fn) && /\.(jpg|jpeg|png|webp)$/i.test(fn)
    );

    for (const [fn, file] of unmatchedMedia) {
      const path = `${activeProject.id}/inbox/${crypto.randomUUID()}-${fn}`;
      const { error: upErr } = await supabase.storage.from("receipts").upload(path, file);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(path);
        // Find related media event for timestamp/sender
        const relatedEvent = mediaEvents.find((e) => e.attachedFilename === fn);
        await supabase.from("receipt_inbox").insert({
          project_id: activeProject.id,
          import_run_id: run.id,
          storage_path: urlData.publicUrl,
          original_filename: fn,
          whatsapp_sender: relatedEvent?.sender || null,
          timestamp: relatedEvent?.timestamp?.toISOString() || null,
        });
      }
    }

    // Update import run stats
    await supabase.from("import_runs").update({
      expenses_imported: rows.length,
      receipts_matched: receiptsMatched,
      receipts_unmatched: receiptsUnmatched + unmatchedMedia.length,
    }).eq("id", run.id);

    setImportResult({
      expenses: rows.length,
      receipts: receiptsMatched,
      inbox: unmatchedMedia.length,
    });
    setStep(4);
    toast({ title: "Import complete", description: `${rows.length} expenses imported.` });
  }, [activeProject, mediaFiles, mediaEvents, toast]);

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
          candidates={candidates}
          receiptMatches={receiptMatches}
          duplicateHashes={duplicateHashes}
          senderToPartner={senderMapping}
          partners={partners}
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
            <p className="text-sm">{importResult.receipts} receipts auto-linked</p>
            {importResult.inbox > 0 && (
              <p className="text-sm">{importResult.inbox} unmatched receipts sent to inbox</p>
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
