import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, Loader2 } from "lucide-react";
import { parseChat, getUniqueSenders } from "@/lib/whatsappParser";
import type { ParsedMessage } from "@/lib/whatsappParser";

interface UploadStepProps {
  onComplete: (messages: ParsedMessage[], senders: string[]) => void;
}

export default function UploadStep({ onComplete }: UploadStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [summary, setSummary] = useState<{ messages: number; senders: number } | null>(null);

  const processFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const text = await file.text();
      const parsed = parseChat(text);
      if (parsed.length === 0) {
        setError("No messages found. Make sure this is a WhatsApp _chat.txt export.");
        setLoading(false);
        return;
      }
      const senders = getUniqueSenders(parsed);
      setSummary({ messages: parsed.length, senders: senders.length });
      onComplete(parsed, senders);
    } catch {
      setError("Failed to read file. Make sure it's a valid WhatsApp chat export.");
    }
    setLoading(false);
  }, [onComplete]);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".txt")) {
      setError("Please upload a .txt file.");
      return;
    }
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Upload WhatsApp _chat.txt file
        </CardTitle>
        <CardDescription>
          Export your WhatsApp group chat (without media) and upload the _chat.txt file.
          You'll add receipt photos later from each expense's detail page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Parsing chat file...</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Drag & drop your _chat.txt file here, or click to browse
              </p>
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  Browse files
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </label>
              </Button>
            </>
          )}
        </div>
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
        {summary && (
          <p className="text-sm text-muted-foreground mt-3">
            Found {summary.messages} messages from {summary.senders} senders
          </p>
        )}
      </CardContent>
    </Card>
  );
}
