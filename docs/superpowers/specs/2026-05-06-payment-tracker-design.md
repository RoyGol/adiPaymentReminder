# Adi Payment Tracker — Design Spec

**Date:** 2026-05-06
**Stack:** Next.js (App Router) + Supabase + Vercel
**Language:** Hebrew (RTL), mobile-first

---

## Overview

A mobile-first web app for Adi, a speech therapist, to track session payments. The app pulls sessions automatically from her Google Calendar, lets her record payments per session, and shows her who still owes money. Only Adi uses the app — there is no patient-facing interface.

---

## Architecture

- **Frontend:** Next.js (App Router), deployed to Vercel
- **Backend/DB:** Supabase (Postgres + Auth)
- **Auth:** Google OAuth via Supabase Auth — Adi signs in with the same Google account as her calendar, no separate login needed
- **Calendar:** Google Calendar API, read-only access, pulls from Adi's personal (mixed) calendar
- **Locale:** Hebrew, RTL layout throughout

---

## Data Model

### `patients`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | Must match calendar event title exactly |
| default_rate | integer | Price per session in ₪ |
| ignored | boolean | True = dismissed during onboarding, never surfaces again |
| created_at | timestamptz | |

### `sessions`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| patient_id | uuid FK → patients | Null if unlinked |
| calendar_event_id | text | Google Calendar event ID |
| start_time | timestamptz | |
| paid | boolean | Default false |
| amount | integer | Defaults to patient's default_rate at sync time |
| paid_date | date | Null until payment recorded |
| created_at | timestamptz | |

### `sync_log`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| synced_at | timestamptz | Timestamp of last successful sync |
| events_fetched | integer | |

---

## Screens

### 1. Onboarding (first launch only)

**Step 1 — Connect**
Welcome screen. Single "🔗 חיבור Google Calendar" button triggers Google OAuth. Adi grants calendar read access.

**Step 2 — Sync**
Loading screen while the app fetches events from the last 30 days. Shows count of events found.

**Step 3 — Link patients**
All unique event titles found in the calendar are listed. For each name:
- Adi sets a default rate (₪ per session) to add them as a patient
- Or taps "לא מטופל ✕" to dismiss — the name is saved as `ignored = true` and will never resurface on future syncs
- Dismissed rows are shown greyed-out with a strikethrough and an undo button
- "סיום וכניסה לאפליקציה ✓" button completes onboarding (rate fields can be left empty and filled later)

---

### 2. Home — פגישות tab

**Stats row (3 tappable buttons)**
- Total outstanding debt (₪) — red. Tapping navigates to Patients tab filtered to חייבים.
- Today's session count — green. Visual only, no tap action.
- Unpaid session count (all time) — amber. Tapping navigates to Patients tab filtered to חייבים.

**Session list toggle**
Two tabs above the list: "היום" (today) and "לא שולם" (all unpaid, across all time). Defaults to היום.

**Session list**
- "היום" view: today's sessions ordered by time
- "לא שולם" view: all unpaid sessions across all time, ordered by date descending
- Each row: patient name, time, amount badge
  - Red badge = unpaid (shows ₪ amount owed)
  - Green badge = paid (shows ₪ amount with ✓)

**Payment entry (bottom sheet)**
Triggered by tapping any session row. Contains:
- Amount input — pre-filled from patient's default rate, editable
- Date picker — defaults to today
- "אישור תשלום ✓" confirm button

---

### 3. Patients tab — מטופלים tab

**Search bar** — filters list by patient name in real time

**Filter chips** — כולם (all) / חייבים (debtors) / שילם (paid up)

**Patient list**
Each row: patient name, default rate, session count, outstanding balance (red if owed, green if clear)

---

### 4. Patient detail page

Opened by tapping a patient in the Patients tab.

**Header:** Patient name

**Default rate card**
- Shows current rate with "עריכה ✎" button
- Tapping edit reveals inline input + save/cancel

**Stats row (3 boxes)**
- Current debt (₪) — red
- Total paid to date (₪) — green
- Total sessions count — grey

**Session history**
Scrollable list of all sessions, newest first. Each row: date, time, amount badge (paid/unpaid).
Tapping an unpaid session opens the same payment bottom sheet as the home screen.

---

### 5. Calendar sync (ongoing)

- A manual refresh button (or pull-to-refresh) fetches new events since the last sync
- New event titles not matching any existing patient → surfaced as a prompt (same "link or dismiss" UI as onboarding step 3, but inline)
- Event titles matching existing patients are linked automatically

---

## Key Behaviors

- **Name matching** is exact and case-sensitive. If a calendar event title is "שרה כהן" and the patient name is "שרה כהן", they match. Typos don't auto-match.
- **Dismissed names** (`ignored = true`) are silently skipped on all future syncs.
- **Default rate override:** The amount on a session is set from the patient's default rate at sync time. Adi can override it per session when recording payment.
- **No automated reminders.** Adi uses the app to identify who hasn't paid and contacts them manually.

---

## Out of Scope

- Patient-facing portal
- Automated WhatsApp/SMS/email reminders
- Multi-user / clinic admin accounts
- Invoice generation
- Integration with any payment processor
