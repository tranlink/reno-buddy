import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEGP } from "@/lib/constants";
import { ArrowRight, CheckCircle2, HandCoins } from "lucide-react";

interface PartnerBalance {
  id: string;
  name: string;
  balance: number; // positive = overpaid (owed back), negative = underpaid (owes)
  totalContribution: number;
  equalShare: number;
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

function computeSettlements(partners: PartnerBalance[]): Settlement[] {
  // Clone balances
  const debtors = partners
    .filter((p) => p.balance < 0)
    .map((p) => ({ name: p.name, amount: Math.abs(p.balance) }))
    .sort((a, b) => b.amount - a.amount);

  const creditors = partners
    .filter((p) => p.balance > 0)
    .map((p) => ({ name: p.name, amount: p.balance }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const transfer = Math.min(debtors[i].amount, creditors[j].amount);
    if (transfer > 0.01) {
      settlements.push({
        from: debtors[i].name,
        to: creditors[j].name,
        amount: transfer,
      });
    }
    debtors[i].amount -= transfer;
    creditors[j].amount -= transfer;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return settlements;
}

interface Props {
  partnerStats: PartnerBalance[];
}

export default function SettlementSummary({ partnerStats }: Props) {
  const settlements = computeSettlements(partnerStats);
  const allSettled = settlements.length === 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <HandCoins className="h-4 w-4" /> Settlement Summary
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allSettled ? (
          <div className="flex items-center gap-2 text-sm text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            All partners are settled — no payments needed.
          </div>
        ) : (
          <div className="space-y-3">
            {settlements.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 rounded-lg bg-accent/50"
              >
                <span className="text-sm font-medium text-destructive">{s.from}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium text-green-600">{s.to}</span>
                <span className="ml-auto text-sm font-bold">{formatEGP(s.amount)}</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Minimum transfers needed to settle all balances equally.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
