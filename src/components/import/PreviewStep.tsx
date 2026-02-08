import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileCheck, Camera } from "lucide-react";
import { CATEGORIES, formatEGP } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";

export interface MessageRow {
  id: number;
  date: string;
  time: string;
  sender: string;
  partnerName: string;
  partnerId: string;
  text: string;
  hasMedia: boolean;
  mediaFilename: string | null;
  selected: boolean;
  amount: string;
  category: string;
  hash: string;
}

interface PreviewStepProps {
  rows: MessageRow[];
  onRowsChange: (rows: MessageRow[]) => void;
  duplicateHashes: Set<string>;
  onImport: (rows: MessageRow[]) => Promise<void>;
  onBack: () => void;
}

type FilterTab = "all" | "photos" | "numbers";

const HAS_DIGIT = /[\d٠-٩]/;

export default function PreviewStep({
  rows, onRowsChange, duplicateHashes, onImport, onBack,
}: PreviewStepProps) {
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const isMobile = useIsMobile();

  const filteredIndices = useMemo(() => {
    return rows
      .map((r, i) => i)
      .filter((i) => {
        const r = rows[i];
        if (duplicateHashes.has(r.hash)) return false;
        if (filter === "photos") return r.hasMedia;
        if (filter === "numbers") return HAS_DIGIT.test(r.text);
        return true;
      });
  }, [rows, filter, duplicateHashes]);

  const toggleRow = (idx: number) => {
    const next = [...rows];
    next[idx] = { ...next[idx], selected: !next[idx].selected };
    onRowsChange(next);
  };

  const updateAmount = (idx: number, val: string) => {
    const next = [...rows];
    next[idx] = { ...next[idx], amount: val };
    onRowsChange(next);
  };

  const updateCategory = (idx: number, val: string) => {
    const next = [...rows];
    next[idx] = { ...next[idx], category: val === "__none__" ? "" : val };
    onRowsChange(next);
  };

  const toggleAllVisible = (checked: boolean) => {
    const visibleSet = new Set(filteredIndices);
    const next = rows.map((r, i) => visibleSet.has(i) ? { ...r, selected: checked } : r);
    onRowsChange(next);
  };

  const selectedRows = rows.filter((r) => r.selected);
  const selectedCount = selectedRows.length;
  const selectedTotal = selectedRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const missingAmounts = selectedRows.filter((r) => !r.amount || parseFloat(r.amount) <= 0).length;
  const allVisibleSelected = filteredIndices.length > 0 && filteredIndices.every((i) => rows[i].selected);

  const handleImport = async () => {
    setImporting(true);
    await onImport(selectedRows);
    setImporting(false);
  };

  if (isMobile) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCheck className="h-5 w-5" /> Preview & Select
          </CardTitle>
          <CardDescription>Select messages to import as expenses and enter amounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
              <TabsTrigger value="photos" className="flex-1">📷 Photos</TabsTrigger>
              <TabsTrigger value="numbers" className="flex-1">123</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{filteredIndices.length} messages</span>
            <span>{selectedCount} selected · {formatEGP(selectedTotal)}</span>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox checked={allVisibleSelected} onCheckedChange={(c) => toggleAllVisible(!!c)} />
            <span className="text-xs">Select all visible</span>
          </div>

          {missingAmounts > 0 && (
            <p className="text-xs text-destructive">{missingAmounts} selected expenses are missing amounts</p>
          )}

          <div className="space-y-2 max-h-[55vh] overflow-auto">
            {filteredIndices.map((idx) => {
              const row = rows[idx];
              return (
                <div key={idx} className={`border rounded-lg p-3 space-y-2 ${row.selected ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(idx)} />
                    <span className="text-xs text-muted-foreground">{row.date}</span>
                    <span className="text-xs font-medium">{row.partnerName}</span>
                    {row.hasMedia && <Camera className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{row.text}</p>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={row.amount}
                      onChange={(e) => updateAmount(idx, e.target.value)}
                      className={`flex-1 h-8 text-xs ${row.selected && (!row.amount || parseFloat(row.amount) <= 0) ? "border-destructive" : ""}`}
                    />
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
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" onClick={onBack} size="sm">Back</Button>
            <Button onClick={handleImport} disabled={importing || selectedCount === 0 || missingAmounts > 0} size="sm">
              {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-1" /> Importing...</> : `Import ${selectedCount}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="h-5 w-5" /> Preview & Select
        </CardTitle>
        <CardDescription>Select messages to import as expenses and enter amounts.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="photos">📷 With Photos</TabsTrigger>
              <TabsTrigger value="numbers">With Numbers</TabsTrigger>
            </TabsList>
          </Tabs>
          <span className="text-sm text-muted-foreground">Showing {filteredIndices.length} messages</span>
          <span className="text-sm font-medium">{selectedCount} selected · {formatEGP(selectedTotal)}</span>
        </div>

        {missingAmounts > 0 && (
          <p className="text-sm text-destructive mb-2">{missingAmounts} selected expenses are missing amounts</p>
        )}

        <div className="overflow-auto max-h-[60vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allVisibleSelected} onCheckedChange={(c) => toggleAllVisible(!!c)} />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead className="max-w-[280px]">Message</TableHead>
                <TableHead className="w-10">📷</TableHead>
                <TableHead>Amount (EGP)</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredIndices.map((idx) => {
                const row = rows[idx];
                return (
                  <TableRow key={idx} className={row.selected ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(idx)} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.date}</TableCell>
                    <TableCell className="text-xs">{row.partnerName}</TableCell>
                    <TableCell className="max-w-[280px] text-xs truncate" title={row.text}>
                      {row.text.slice(0, 100)}
                    </TableCell>
                    <TableCell>
                      {row.hasMedia && <Camera className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        placeholder="0"
                        value={row.amount}
                        onChange={(e) => updateAmount(idx, e.target.value)}
                        className={`w-24 h-8 text-xs ${row.selected && (!row.amount || parseFloat(row.amount) <= 0) ? "border-destructive" : ""}`}
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
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
            <Button onClick={handleImport} disabled={importing || selectedCount === 0 || missingAmounts > 0}>
              {importing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Importing...</> : `Import ${selectedCount} expenses`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
