import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjects";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History } from "lucide-react";

interface ImportRun {
  id: string;
  created_at: string;
  filename: string | null;
  expenses_imported: number | null;
  receipts_matched: number | null;
  receipts_unmatched: number | null;
}

export default function ImportHistory() {
  const { activeProject } = useProjects();
  const [runs, setRuns] = useState<ImportRun[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeProject) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("import_runs")
        .select("*")
        .eq("project_id", activeProject.id)
        .order("created_at", { ascending: false });
      setRuns((data as ImportRun[]) || []);
      setLoading(false);
    };
    fetch();
  }, [activeProject]);

  if (!activeProject) return <p className="text-muted-foreground p-4">Select a project first.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <History className="h-6 w-6" /> Import History
      </h1>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-muted-foreground p-6">Loading...</p>
          ) : runs.length === 0 ? (
            <p className="text-muted-foreground p-6 text-center">No imports yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Receipts Matched</TableHead>
                  <TableHead className="text-right">In Inbox</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="text-sm">
                      {new Date(run.created_at).toLocaleDateString()} {new Date(run.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </TableCell>
                    <TableCell className="text-sm">{run.filename || "WhatsApp Export"}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{run.expenses_imported ?? 0}</TableCell>
                    <TableCell className="text-right text-sm">{run.receipts_matched ?? 0}</TableCell>
                    <TableCell className="text-right text-sm">{run.receipts_unmatched ?? 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
