

## Add Search to Expenses Page

Add a text search input at the top of the filters that searches across notes, category, partner name, and amount -- supporting both Arabic and English text.

### What will change

**File:** `src/pages/Expenses.tsx` only.

1. Add a new `searchQuery` state (`useState("")`)
2. Add a search `<Input>` field with a search icon above the existing filter dropdowns, with placeholder text "Search expenses... / بحث..."
3. Apply the search filter after all existing filters:
   - Lowercase both the query and the searchable fields for case-insensitive matching
   - Search across: `notes`, `category`, partner `name` (looked up from partners array), and `amount_egp` (converted to string)
   - Arabic text works naturally since JavaScript string `.includes()` handles Unicode
4. Import `Input` from `@/components/ui/input` and `Search` icon from `lucide-react`

### Search behavior

- Filters as you type (no submit button needed)
- Works with all existing dropdown filters (search is applied on top of them)
- Matches partial words in any language
- The input is full-width on mobile and constrained on desktop

### Technical details

The filtering logic addition after the existing filters (around line 50):

```typescript
if (searchQuery.trim()) {
  const q = searchQuery.trim().toLowerCase();
  filtered = filtered.filter((e) => {
    const partner = partners.find((p) => p.id === e.paid_by_partner_id);
    const searchable = [
      e.notes,
      e.category,
      partner?.name,
      String(e.amount_egp),
    ].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(q);
  });
}
```

No database changes needed. JavaScript's native string methods handle Arabic/Unicode text correctly.

