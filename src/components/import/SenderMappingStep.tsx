import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Partner = Tables<"partners">;

interface SenderMappingStepProps {
  senders: string[];
  partners: Partner[];
  existingMappings: Map<string, { partnerId: string | null; ignored: boolean }>;
  onComplete: (mapping: Map<string, { partnerId: string | null; ignored: boolean }>) => void;
  onBack: () => void;
}

// Default guesses for common names
const DEFAULT_GUESSES: Record<string, string[]> = {
  ahmed: ["ahmed", "bayoumy"],
  amr: ["amr", "said"],
  "abd el rahman": ["boota", "abd", "abdel", "abdelrahman"],
};

function guessPartner(sender: string, partners: Partner[]): string | null {
  const lower = sender.toLowerCase();
  for (const partner of partners) {
    const pName = partner.name.toLowerCase();
    const guesses = DEFAULT_GUESSES[pName] || [pName];
    if (guesses.some((g) => lower.includes(g))) return partner.id;
  }
  return null;
}

export default function SenderMappingStep({
  senders, partners, existingMappings, onComplete, onBack,
}: SenderMappingStepProps) {
  const [mapping, setMapping] = useState<Map<string, { partnerId: string | null; ignored: boolean }>>(new Map());

  useEffect(() => {
    const m = new Map<string, { partnerId: string | null; ignored: boolean }>();
    for (const sender of senders) {
      const existing = existingMappings.get(sender);
      if (existing) {
        m.set(sender, existing);
      } else {
        const guess = guessPartner(sender, partners);
        m.set(sender, { partnerId: guess, ignored: false });
      }
    }
    setMapping(m);
  }, [senders, partners, existingMappings]);

  const handleChange = (sender: string, value: string) => {
    const next = new Map(mapping);
    if (value === "__ignore__") {
      next.set(sender, { partnerId: null, ignored: true });
    } else {
      next.set(sender, { partnerId: value, ignored: false });
    }
    setMapping(next);
  };

  const allMapped = Array.from(mapping.values()).every((v) => v.ignored || v.partnerId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" /> Map Senders to Partners
        </CardTitle>
        <CardDescription>
          Map each WhatsApp sender to a project partner, or ignore them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {senders.map((sender) => {
          const val = mapping.get(sender);
          const selectVal = val?.ignored ? "__ignore__" : val?.partnerId || "";
          return (
            <div key={sender} className="flex items-center gap-3">
              <span className="text-sm font-medium min-w-[140px] truncate">{sender}</span>
              <Select value={selectVal} onValueChange={(v) => handleChange(sender, v)}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select partner..." />
                </SelectTrigger>
                <SelectContent>
                  {partners.filter((p) => p.active).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                  <SelectItem value="__ignore__">🚫 Ignore sender</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        })}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>Back</Button>
          <Button onClick={() => onComplete(mapping)} disabled={!allMapped}>
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
