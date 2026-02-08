

# Airbnb Reno Tracker — Implementation Plan

## Overview
A mobile-first web app for tracking renovation expenses across multiple Airbnb projects. Built with Lovable Cloud for backend (database, auth, file storage). Currency is EGP only. Partner shares are calculated from contributions.

---

## Phase 1: Backend Setup (Lovable Cloud)

### Authentication
- Simple email/password login and signup page
- Protected routes — redirect unauthenticated users to login

### Database Tables
- **projects** — id, name, description, whatsapp_group_name, created_at, user_id
- **partners** — id, project_id, name, active (boolean)
- **expenses** — id, project_id, date, amount_egp, paid_by_partner_id, category (optional), notes, receipt_urls (array), missing_receipt (boolean), created_at, updated_at
- **audit_log** — id, project_id, entity_type, entity_id, field_changed, old_value, new_value, changed_at, note

### File Storage
- Storage bucket for receipt photos with proper access policies

### Seed Data
- Default project: "Mountain Cave Retreat" with description "Expenses (two new studio)" and WhatsApp group name "Mountain Cave Retreat – Expenses"
- Default partners: Ahmed, Abd El Rahman, Amr

---

## Phase 2: Project Management & Navigation

### Project Selector
- Dropdown in the header to switch active project
- "Create new project" option in the dropdown
- All pages scoped to the selected project

### Create New Project Flow
- Form: name, description, WhatsApp group name
- Option to "Copy partners from another project"

### Navigation Menu (mobile-first)
- Dashboard, Expenses, Add Expense, Project Settings, Import from WhatsApp (Guide), Export CSV

---

## Phase 3: Dashboard (Home)

- **Header**: Project name, description, WhatsApp group name
- **Summary tiles**: Total spend (EGP), number of expenses, missing receipts count, last expense date
- **Partner contributions table**: Name, total paid, share % of total, expense count
- **Category totals**: Sum by category
- **Recent expenses**: Latest 10 with quick view/edit links
- **Quick actions**: Add Expense, Quick Add, Export CSV buttons
- **Integrity check**: "Sum of all expenses = Total spend" with mismatch warning

---

## Phase 4: Expense Management

### Add Expense Page
- Fields: date (default today), amount (EGP), paid by (partner dropdown), category (optional dropdown with 12 predefined categories), notes, receipt photo upload, missing receipt toggle
- Validation: require at least 1 receipt if "missing receipt" is off

### Expenses Feed
- List view sorted newest first
- Filters: month, paid by, category
- Each item shows: date, amount, paid by, category, receipt status badge (✅ or ⚠️)

### Expense Details
- Full view of all fields including receipt images
- Edit button leading to edit form

### Edit/Correct Expense
- All fields editable including changing who paid
- Every change logged to audit_log with old/new values, timestamp, and optional correction note

---

## Phase 5: Project Settings

- Edit project name, description, WhatsApp group name
- Manage partners: add new, edit names, deactivate (soft delete)

---

## Phase 6: Utilities

### Import from WhatsApp (Guide Page)
- Static instructional page with step-by-step WhatsApp export guide
- "Copy message" template with copy-to-clipboard button for the team announcement message

### Export CSV
- Export all expenses for the selected project
- Columns: project_name, date, amount_egp, paid_by, category, notes, receipt_count, missing_receipt, created_at

---

## Design Approach
- **Mobile-first** responsive design
- Clean, card-based UI with clear typography
- EGP currency formatting throughout
- Toast notifications for actions (save, delete, export)
- Color-coded badges for receipt status

