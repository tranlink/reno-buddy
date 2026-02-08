

## Clarify Fund Transfers as "Unitemized Spending"

### Understanding the problem

Fund transfers represent money that **was already spent** on the project, but unlike regular expenses, they are not tied to specific items (no category, no receipt, no description of what was purchased). The current dashboard doesn't make this distinction clear -- it just shows "Total Funded" separately, which is confusing.

### What will change

**Update `src/pages/Dashboard.tsx`:**

1. **Rename "Total Funded" to "Unitemized Spending"** -- money that was spent but without detailed line items attached

2. **Add a new "Total Project Cost" metric** that combines both:
   - Total Project Cost = Itemized Expenses + Unitemized Spending
   - This gives the full picture of how much has been spent overall

3. **Restructure the summary tiles** into a clear hierarchy:

```text
+---------------------------------------------------------------+
|  Project Spending Overview                                     |
|                                                                |
|  Total Project Cost        EGP X,XXX                          |
|  (all money spent on the project)                              |
|                                                                |
|  Itemized Expenses    EGP X,XXX   (with receipts/categories)  |
|  Unitemized Funds     EGP X,XXX   (spent but no items listed) |
+---------------------------------------------------------------+

[ Expenses: N ]  [ Missing Receipts: N ]  [ Needs Review: N ]
```

4. **Update the Fund Transfers section title** to "Unitemized Fund Transfers" with a subtitle: "Money spent on the project without specific items attached. Consider adding expenses to account for these funds."

5. **Update Partner Contributions table**: Rename "Funds Sent" column to "Unitemized" for clarity

### Technical details

**File: `src/pages/Dashboard.tsx`**

- Compute `totalProjectCost = totalSpend + totalFunded`
- Replace the current 5-tile grid with:
  - A "Project Spending Overview" card showing total cost broken down into itemized vs unitemized
  - A 3-tile row for Expenses count, Missing Receipts, Needs Review
- Rename labels and add descriptive subtitles throughout
- Update the Fund Transfers card heading and description

No new files or dependencies needed. Only `src/pages/Dashboard.tsx` is modified.

