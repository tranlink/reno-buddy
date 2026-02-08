

## Delete Empty Duplicate Projects

### Current state

| Project | Created | Expenses | Action |
|---------|---------|----------|--------|
| Mountain Cave Retreat (df7eb9e4) | First | 191 | KEEP |
| Mountain Cave Retreat (11b9ba95) | Second | 0 | DELETE |
| Mountain Cave Retreat (e4d61915) | Third | 0 | DELETE |

### What will happen

**1. Database cleanup** -- Delete the two empty duplicate projects and their related (also empty) data using the data modification tool:

```sql
-- Delete the two empty projects (cascading will clean up any related rows)
DELETE FROM partners WHERE project_id IN ('11b9ba95-3ae9-4f4f-913a-fd6e64eab7a0', 'e4d61915-fb2b-4fe2-8489-c0b8caecb346');
DELETE FROM projects WHERE id IN ('11b9ba95-3ae9-4f4f-913a-fd6e64eab7a0', 'e4d61915-fb2b-4fe2-8489-c0b8caecb346');
```

**2. Add delete feature to Project Settings** (`src/pages/ProjectSettings.tsx`) for future use:
- Add a "Danger Zone" card at the bottom of settings
- "Delete Project" button opens a confirmation dialog
- User must type the exact project name to confirm
- Cannot delete the last remaining project
- After deletion, switches to the next available project

**3. Database migration** -- Add cascading foreign keys so future project deletions automatically clean up related data:
- `partners`, `expenses`, `audit_log`, `import_runs`, `import_message_hashes`, `receipt_inbox`, `sender_mappings` will all get `ON DELETE CASCADE` constraints on their `project_id` column

### Safety guarantees
- Your project with 191 expenses is untouched
- Only the two projects with zero expenses are removed
- The delete UI feature requires typing the exact project name to confirm
- Last project can never be deleted
