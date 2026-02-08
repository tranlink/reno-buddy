

## Project Ownership Percentage on Dashboard

Add a visual "Ownership" section to the Dashboard that shows each partner's percentage share of the project based on their total contribution (expenses paid + funds sent) relative to the total spend.

### What will be added

A new **"Project Ownership"** card placed right after the Partner Contributions table. It will display:

- Each partner's name with their ownership percentage (e.g., "Ahmed — 45.2%")
- A colored progress bar showing their share visually
- Each partner gets a distinct color (using Tailwind palette: blue, green, amber, etc.)
- A stacked horizontal bar at the top showing all partners' shares side by side for a quick visual comparison
- The percentage is calculated as: `(totalContribution / totalSpend) * 100`
- If totalSpend is 0, show "No expenses yet"

### Layout

```text
+--------------------------------------------------+
| Project Ownership                                 |
|                                                   |
| [========== stacked bar (all partners) =========] |
|                                                   |
| Ahmed        ███████████████░░░░░░  45.2%         |
| Abd El Rahman ██████████░░░░░░░░░░  32.1%         |
| Amr          █████░░░░░░░░░░░░░░░░  22.7%         |
+--------------------------------------------------+
```

### Technical Details

**File changed:** `src/pages/Dashboard.tsx` only.

1. Add a `Progress` component import from `@/components/ui/progress`
2. Define a color array: `const PARTNER_COLORS = ["bg-blue-500", "bg-green-500", "bg-amber-500", "bg-purple-500"]`
3. Use the existing `partnerStats` array which already has the `share` field calculated as `(totalContribution / totalSpend) * 100`
4. Sort partners by share descending for display
5. Render a new `<Card>` section with:
   - A stacked horizontal bar (a flex row of colored `<div>` elements, each with `width: X%`)
   - Below it, each partner as a row: name, a Radix progress bar with the partner's color, and the percentage number
6. Place this card between the Partner Contributions table and the Fund Transfers section

No database changes, no new files, no schema updates needed. This is a pure UI addition using data already computed.
