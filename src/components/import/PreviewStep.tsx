import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, FileCheck, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { CATEGORIES, formatEGP } from "@/lib/constants";
import { useIsMobile } from "@/hooks/use-mobile";

export interface MessageRow {
  id: number;
  date: string;
  time: string;
  sender: string;
  partnerName: string;
  partnerId: string;
  displayText: string;
  hasMedia: boolean;
  selected: boolean;
  amount: string;
  category: string;
}

interface PreviewStepProps {
  rows: MessageRow[];
  onRowsChange: (rows: MessageRow[]) => void;
  onImport: (rows: MessageRow[]) => Promise<void>;
  onBack: () => void;
}

type FilterTab = "all" | "photos" | "numbers";
const HAS_DIGIT = /[\d٠-٩]/;
const PAGE_SIZE = 50;

export default function PreviewStep({ rows, onRowsChange, onImport, onBack }: PreviewStepProps) {
  const [importing, setImporting] = useState(false);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [page, setPage] = useState(0);
  const isMobile = useIsMobile();

  // Filtered indices across all pages
  const filteredIndices = useMemo(() => {
    return rows
      .map((_, i) => i)
      .filter((i) => {
        const r = rows[i];
        if (filter === "photos") return r.hasMedia;
        if (filter === "numbers") return HAS_DIGIT.test(r.displayText);
        return true;
      });
  }, [rows, filter]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredIndices.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageIndices = filteredIndices.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Reset page when filter changes
  const handleFilterChange = (v: string) => {
    setFilter(v as FilterTab);
    setPage(0);
  };

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

  // Select all on current page
  const toggleAllVisible = (checked: boolean) => {
    const visibleSet = new Set(pageIndices);
    const next = rows.map((r, i) => visibleSet.has(i) ? { ...r, selected: checked } : r);
    onRowsChange(next);
  };

  // Select all filtered (across all pages)
  const selectAllFiltered = () => {
    if (filteredIndices.length > 100 && !confirm(`Select all ${filteredIndices.length} filtered messages?`)) return;
    const filteredSet = new Set(filteredIndices);
    const next = rows.map((r, i) => filteredSet.has(i) ? { ...r, selected: true } : r);
    onRowsChange(next);
  };

  const selectedRows = rows.filter((r) => r.selected);
  const selectedCount = selectedRows.length;
  const selectedTotal = selectedRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const missingAmounts = selectedRows.filter((r) => !r.amount || parseFloat(r.amount) <= 0).length;
  const allPageSelected = pageIndices.length > 0 && pageIndices.every((i) => rows[i].selected);

  const handleImport = async () => {
    setImporting(true);
    await onImport(selectedRows);
    setImporting(false);
  };

  const PaginationControls = () => (
    totalPages > 1 ? (
      <div className="flex items-center justify-center gap-2 text-sm">
        <Button variant="outline" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-muted-foreground">Page {safePage + 1} of {totalPages}</span>
        <Button variant="outline" size="sm" disabled={safePage >= totalPages - 1} onClick={() => setPage(safePage + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    ) : null
  );

  const TopBar = () => (
    <div className="space-y-2">
      <Tabs value={filter} onValueChange={handleFilterChange}>
        <TabsList className={isMobile ? "w-full" : ""}>
          <TabsTrigger value="all" className={isMobile ? "flex-1" : ""}>All</TabsTrigger>
          <TabsTrigger value="photos" className={isMobile ? "flex-1" : ""}>📷 Photos</TabsTrigger>
          <TabsTrigger value="numbers" className={isMobile ? "flex-1" : ""}>🔢 Numbers</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span>{filteredIndices.length} messages</span>
        {selectedCount > 0 && (
          <span className="font-medium text-foreground">{selectedCount} selected · {formatEGP(selectedTotal)}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Checkbox checked={allPageSelected} onCheckedChange={(c) => toggleAllVisible(!!c)} />
          <span className="text-xs">Select page</span>
        </div>
        {filteredIndices.length > PAGE_SIZE && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={selectAllFiltered}>
            Select all {filteredIndices.length} filtered
          </Button>
        )}
      </div>

      {missingAmounts > 0 && (
        <p className="text-xs text-destructive">{missingAmounts} selected items still need amounts</p>
      )}
    </div>
  );

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
          <TopBar />

          <div className="space-y-2 max-h-[55vh] overflow-auto">
            {pageIndices.map((idx) => {
              const row = rows[idx];
              return (
                <div key={idx} className={`border rounded-lg p-3 space-y-2 ${row.selected ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center gap-2">
                    <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(idx)} />
                    <span className="text-xs text-muted-foreground">{row.date}</span>
                    <span className="text-xs font-medium">{row.partnerName}</span>
                    {row.hasMedia && <Camera className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{row.displayText}</p>
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

          <PaginationControls />

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
        <TopBar />

        <div className="overflow-auto max-h-[60vh] mt-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={allPageSelected} onCheckedChange={(c) => toggleAllVisible(!!c)} />
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Partner</TableHead>
                <TableHead className="max-w-[280px]">Message</TableHead>
                <TableHead className="w-10">📷</TableHead>
                <TableHead>Amount (EGP)</TableHead>
                <TableHead>Category</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageIndices.map((idx) => {
                const row = rows[idx];
                return (
                  <TableRow key={idx} className={row.selected ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox checked={row.selected} onCheckedChange={() => toggleRow(idx)} />
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">{row.date}</TableCell>
                    <TableCell className="text-xs">{row.partnerName}</TableCell>
                    <TableCell className="max-w-[280px] text-xs truncate" title={row.displayText}>
                      {row.displayText.slice(0, 100)}
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

        <div className="mt-3">
          <PaginationControls />
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
