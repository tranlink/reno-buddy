import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileArchive, Loader2 } from "lucide-react";
import JSZip from "jszip";

interface UploadStepProps {
  onComplete: (chatText: string, mediaFiles: Map<string, File>) => void;
}

export default function UploadStep({ onComplete }: UploadStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const processZip = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const zip = await JSZip.loadAsync(file);
      let chatText = "";
      const mediaFiles = new Map<string, File>();

      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;
        const basename = filename.split("/").pop() || filename;

        if (basename === "_chat.txt" || basename.endsWith("_chat.txt") || basename.includes("chat") && basename.endsWith(".txt")) {
          chatText = await zipEntry.async("text");
        } else if (/\.(jpg|jpeg|png|webp|gif|mp4|mov|mp3|ogg|opus|wav|m4a|pdf)$/i.test(basename)) {
          const blob = await zipEntry.async("blob");
          const ext = basename.split(".").pop()?.toLowerCase() || "";
          const mimeMap: Record<string, string> = {
            jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
            gif: "image/gif", mp4: "video/mp4", mov: "video/quicktime",
            mp3: "audio/mpeg", ogg: "audio/ogg", opus: "audio/opus", wav: "audio/wav",
            m4a: "audio/mp4", pdf: "application/pdf",
          };
          mediaFiles.set(basename, new File([blob], basename, { type: mimeMap[ext] || "application/octet-stream" }));
        }
      }

      if (!chatText) {
        setError("No chat text file found in the ZIP. Expected _chat.txt.");
        setLoading(false);
        return;
      }

      onComplete(chatText, mediaFiles);
    } catch (e) {
      setError("Failed to read ZIP file. Make sure it's a valid WhatsApp export.");
    }
    setLoading(false);
  }, [onComplete]);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".zip")) {
      setError("Please upload a ZIP file.");
      return;
    }
    processZip(file);
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
          <FileArchive className="h-5 w-5" /> Upload WhatsApp Export
        </CardTitle>
        <CardDescription>
          Export your WhatsApp group chat (with media) and upload the ZIP file here.
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
              <p className="text-sm text-muted-foreground">Extracting ZIP file...</p>
            </div>
          ) : (
            <>
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">
                Drag & drop your WhatsApp export ZIP here, or click to browse
              </p>
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  Browse files
                  <input
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                  />
                </label>
              </Button>
            </>
          )}
        </div>
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      </CardContent>
    </Card>
  );
}
