import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileCheck } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { formatEGP } from "@/lib/constants";
import type { ExpenseCandidate, ReceiptMatch } from "@/lib/whatsappParser";
import type { Tables } from "@/integrations/supabase/types";

type Partner = Tables<"partners">;

interface PreviewRow {
  candidate: ExpenseCandidate;
  included: boolean;
  amountEgp: number;
  category: string;
  receiptMatch: ReceiptMatch | null;
  isDuplicate: boolean;
  mappedPartnerName: string;
  mappedPartnerId: string | null;
}

interface PreviewStepProps {
  candidates: ExpenseCandidate[];
  receiptMatches: Map<number, ReceiptMatch | null>;
  duplicateHashes: Set<string>;
  senderToPartner: Map<string, { partnerId: string | null; ignored: boolean }>;
  partners: Partner[];
  onImport: (rows: PreviewRow[]) => Promise<void>;
  onBack: () => void;
}

export default function PreviewStep({
  candidates, receiptMatches, duplicateHashes, senderToPartner, partners, onImport, onBack,
}: PreviewStepProps) {
  const [importing, setImporting] = useState(false);

  const getPartnerName = (id: string | null) => partners.find((p) => p.id === id)?.name || "—";

  const [rows, setRows] = useState<PreviewRow[]>(() =>
    candidates.map((c, idx) => {
      const mapping = senderToPartner.get(c.message.sender);
      const isDuplicate = duplicateHashes.has(c.message.hash);
      return {
        candidate: c,
        included: !c.excluded && !isDuplicate && !mapping?.ignored && !!mapping?.partnerId,
        amountEgp: c.amountEgp,
        category: c.category || "",
        receiptMatch: receiptMatches.get(idx) || null,
        isDuplicate,
        mappedPartnerName: getPartnerName(mapping?.partnerId || null),
        mappedPartnerId: mapping?.partnerId || null,
      };
    })
  );

  const toggleRow = (idx: number) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, included: !r.included } : r));
  };

  const updateAmount = (idx: number, val: string) => {
    const num = parseFloat(val) || 0;
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, amountEgp: num } : r));
  };

  const updateCategory = (idx: number, val: string) => {
    setRows((prev) => prev.map((r, i) => i === idx ? { ...r, category: val === "__none__" ? "" : val } : r));
  };

  const selectedCount = rows.filter((r) => r.included).length;

  const handleImport = async () => {
    setImporting(true);
    await onImport(rows.filter((r) => r.included));
    setImporting(false);
  };

  const receiptBadge = (match: ReceiptMatch | null, isDuplicate: boolean) => {
    if (isDuplicate) return <Badge variant="secondary">Already imported</Badge>;
    if (!match) return <Badge variant="outline" className="text-warning border-warning">Unmatched</Badge>;
    if (match.confidence === "high") return <Badge className="bg-success text-success-foreground">Matched ✓</Badge>;
    if (match.confidence === "medium") return <Badge variant="secondary">Medium</Badge>;
    return <Badge variant="outline">Low</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" /> Preview & Import
        </CardTitle>
        <CardDescription>
          Review detected expenses. Edit amounts or categories, then import selected rows.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3 text-sm py-2 mb-2">
          <span>{rows.filter(r => r.included).length} of {rows.length} selected</span>
          <span className="text-yellow-600">
            {rows.filter(r => r.candidate.needsReview && !r.isDuplicate).length} need review
          </span>
          <span className="text-muted-foreground">
            {rows.filter(r => r.isDuplicate).length} duplicates
          </span>
          <span className="font-medium">
            Total: {formatEGP(rows.filter(r => r.included).reduce((s, r) => s + r.amountEgp, 0))}
          </span>
        </div>
        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={rows.filter(r => !r.isDuplicate).every(r => r.included)}
                    onCheckedChange={(checked) => {
                      setRows(prev => prev.map(r => r.isDuplicate ? r : { ...r, included: !!checked }));
                    }}
                  />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead>Amount (EGP)</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Receipt</TableHead>
                <TableHead className="max-w-[200px]">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, idx) => (
                <TableRow key={idx} className={row.isDuplicate ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox
                      checked={row.included}
                      onCheckedChange={() => toggleRow(idx)}
                      disabled={row.isDuplicate}
                    />
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {row.candidate.message.timestamp.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-xs">{row.candidate.message.sender}</TableCell>
                  <TableCell className="text-xs">{row.mappedPartnerName}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      value={row.amountEgp}
                      onChange={(e) => updateAmount(idx, e.target.value)}
                      className="w-24 h-8 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <Select value={row.category || "__none__"} onValueChange={(v) => updateCategory(idx, v)}>
                      <SelectTrigger className="w-28 h-8 text-xs">
                        <SelectValue placeholder="—" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">—</SelectItem>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>{receiptBadge(row.receiptMatch, row.isDuplicate)}</TableCell>
                  <TableCell className={`max-w-[200px] text-xs truncate ${row.candidate.isTotalLine ? "opacity-40" : ""}`} title={row.candidate.message.text}>
                    {row.candidate.message.text.slice(0, 80)}
                    {row.candidate.needsReview && <Badge variant="outline" className="ml-1 text-warning border-warning">Review</Badge>}
                    {row.candidate.isTotalLine && <Badge variant="outline" className="ml-1">Total</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
            <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
              {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</> : `Import ${selectedCount} expenses`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export type { PreviewRow };
