import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy } from "lucide-react";

const TEMPLATE_MSG = `From today, please log all renovation expenses in the app (EGP). Add receipt photo (or mark missing receipt). WhatsApp is for updates; the app is the source of truth.`;

export default function WhatsAppGuide() {
  const { toast } = useToast();

  const copy = () => {
    navigator.clipboard.writeText(TEMPLATE_MSG);
    toast({ title: "Copied to clipboard!" });
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-xl font-bold">How to Export Expenses from WhatsApp</h1>

      <Card>
        <CardContent className="p-4 space-y-3 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Open WhatsApp and go to the relevant group.</li>
            <li>Tap the group name to open Group Info.</li>
            <li>Scroll down and tap <strong>"Export Chat"</strong>.</li>
            <li>Choose:
              <ul className="ml-5 mt-1 list-disc space-y-1">
                <li><strong>"Without media"</strong> — text only (smaller file)</li>
                <li><strong>"Include media"</strong> — includes receipt photos (bigger file)</li>
              </ul>
            </li>
            <li>Choose where to save (Email, Google Drive, Files app, etc.).</li>
            <li>You'll get a <code>.txt</code> file with chat messages, plus images if included.</li>
            <li><strong>Recommendation:</strong> Decide a cutoff date. Log new expenses in the app from today. Use the export only for older expenses.</li>
            <li><strong>Note:</strong> WhatsApp exports don't link receipts to expense lines automatically. Add receipts manually when backfilling.</li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Team Announcement Template</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm bg-secondary rounded-lg p-3 mb-3">{TEMPLATE_MSG}</p>
          <Button size="sm" variant="outline" onClick={copy}><Copy className="mr-1 h-3.5 w-3.5" />Copy Message</Button>
        </CardContent>
      </Card>
    </div>
  );
}
