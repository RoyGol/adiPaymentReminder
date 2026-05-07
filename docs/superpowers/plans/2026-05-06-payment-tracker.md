# Adi Payment Tracker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Hebrew RTL web app for tracking speech therapy session payments, with Google Calendar auto-sync and Supabase backend.

**Architecture:** Next.js 14 App Router frontend with Supabase (Postgres + Auth). Google OAuth sign-in grants calendar read access; the provider token from the Supabase session is used directly to call the Google Calendar API. RLS ensures Adi only ever sees her own data.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, @supabase/ssr, googleapis, date-fns, Vitest, @testing-library/react

---

## File Map

```
app/
  layout.tsx                         # Root layout: RTL dir, dark bg, Hebrew font, BottomNav
  page.tsx                           # Redirect → /sessions or /onboarding
  login/page.tsx                     # Google OAuth sign-in page
  auth/callback/route.ts             # Supabase OAuth callback handler
  onboarding/page.tsx                # 3-step onboarding (server: redirect if already set up)
  sessions/page.tsx                  # Home — פגישות tab (server component)
  patients/page.tsx                  # Patients tab (server component)
  patients/[id]/page.tsx             # Patient detail (server component)
  api/
    calendar/sync/route.ts           # POST — fetch calendar events, upsert sessions
    sessions/[id]/route.ts           # PATCH — mark session paid
    patients/route.ts                # GET list, POST create
    patients/[id]/route.ts           # PATCH update default_rate

components/
  BottomNav.tsx                      # Fixed tab bar (פגישות / מטופלים)
  StatsBar.tsx                       # 3 stat buttons (debt, today count, unpaid count)
  SessionRow.tsx                     # One session row with amount badge
  SessionList.tsx                    # Toggle (היום / לא שולם) + list of SessionRows
  PaymentSheet.tsx                   # Bottom sheet: amount + date + confirm
  PatientRow.tsx                     # One patient row: name, rate, balance
  PatientList.tsx                    # Search + filter chips + list of PatientRows
  RateCard.tsx                       # Editable default rate card (view ↔ edit toggle)
  OnboardingFlow/
    index.tsx                        # Step state machine (1 Connect → 2 Sync → 3 Link)
    StepConnect.tsx                  # "Connect Google Calendar" button
    StepSync.tsx                     # Loading screen, calls /api/calendar/sync
    StepLinkPatients.tsx             # Name list with rate inputs + dismiss buttons

lib/
  types.ts                           # Patient, Session, SyncLog, CalendarEvent interfaces
  supabase/
    client.ts                        # createBrowserClient
    server.ts                        # createServerClient (uses next/headers cookies)
  db/
    patients.ts                      # getPatients, createPatient, updatePatientRate,
                                     # ignorePatientName, getPatientWithStats
    sessions.ts                      # getTodaySessions, getUnpaidSessions,
                                     # getPatientSessions, markSessionPaid,
                                     # upsertSession, getSessionStats
  google-calendar.ts                 # fetchRecentEvents, matchEventsToPatients

middleware.ts                        # Redirect unauthenticated → /login;
                                     # redirect first-timers → /onboarding

supabase/
  migrations/
    001_initial.sql                  # patients, sessions, sync_log tables + RLS

tests/
  lib/google-calendar.test.ts
  lib/db/patients.test.ts
  lib/db/sessions.test.ts
  components/StatsBar.test.tsx
  components/SessionRow.test.tsx
  components/PaymentSheet.test.tsx
  components/RateCard.test.tsx
  components/PatientRow.test.tsx
```

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json` (via create-next-app)
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`
- Modify: `tailwind.config.ts`

- [ ] **Step 1: Scaffold Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Expected: Next.js project created in current directory with TypeScript, Tailwind, App Router.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/ssr @supabase/supabase-js googleapis date-fns
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 4: Create test setup file**

Create `tests/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add test script to package.json**

In `package.json`, add to `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Configure Tailwind for dark theme**

Replace contents of `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a2e',
        card: '#0f3460',
        'card-hover': '#16213e',
      },
      fontFamily: {
        sans: ['Noto Sans Hebrew', 'sans-serif'],
      },
    },
  },
}

export default config
```

- [ ] **Step 7: Create .env.local**

```bash
cp .env.local.example .env.local 2>/dev/null || true
```

Create `.env.local.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 8: Verify tests run**

```bash
npm test
```

Expected: `No test files found` (no failures — setup is correct).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with Supabase, Vitest, Tailwind"
```

---

## Task 2: Database Schema

**Files:**
- Create: `supabase/migrations/001_initial.sql`

- [ ] **Step 1: Create migration file**

Create `supabase/migrations/001_initial.sql`:

```sql
create table patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  default_rate integer not null default 0,
  ignored boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, name)
);

create table sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  patient_id uuid references patients(id) on delete set null,
  calendar_event_id text not null,
  start_time timestamptz not null,
  paid boolean not null default false,
  amount integer not null default 0,
  paid_date date,
  created_at timestamptz not null default now(),
  unique(user_id, calendar_event_id)
);

create table sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  synced_at timestamptz not null default now(),
  events_fetched integer not null default 0
);

alter table patients enable row level security;
alter table sessions enable row level security;
alter table sync_log enable row level security;

create policy "users manage own patients" on patients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own sessions" on sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users manage own sync_log" on sync_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

- [ ] **Step 2: Apply migration to Supabase**

In the Supabase dashboard → SQL Editor, paste and run the migration. Verify the three tables appear under Table Editor.

- [ ] **Step 3: Configure Google OAuth in Supabase**

In Supabase dashboard → Authentication → Providers → Google:
1. Enable Google provider
2. Enter your Google OAuth Client ID and Secret (from Google Cloud Console)
3. In **Scopes**, add: `https://www.googleapis.com/auth/calendar.readonly`
4. Copy the Supabase callback URL shown — add it to your Google OAuth app's Authorized Redirect URIs

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema with RLS policies"
```

---

## Task 3: Supabase Clients + Auth Middleware

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `middleware.ts`

- [ ] **Step 1: Create browser Supabase client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 2: Create server Supabase client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 3: Create auth middleware**

Create `middleware.ts` in the project root:

```typescript
import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  const publicPaths = ['/login', '/auth']
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  if (!user && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/ middleware.ts
git commit -m "feat: add Supabase clients and auth middleware"
```

---

## Task 4: TypeScript Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/lib/types.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import type { Patient, Session, CalendarEvent } from '@/lib/types'

describe('types', () => {
  it('Patient has required fields', () => {
    const p: Patient = {
      id: '1', user_id: 'u1', name: 'שרה כהן',
      default_rate: 150, ignored: false, created_at: '2026-01-01',
    }
    expect(p.name).toBe('שרה כהן')
  })

  it('Session has required fields', () => {
    const s: Session = {
      id: '1', user_id: 'u1', patient_id: 'p1',
      calendar_event_id: 'ev1', start_time: '2026-05-06T10:00:00Z',
      paid: false, amount: 150, paid_date: null, created_at: '2026-01-01',
    }
    expect(s.paid).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/lib/types.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/types'`

- [ ] **Step 3: Create types**

Create `lib/types.ts`:

```typescript
export interface Patient {
  id: string
  user_id: string
  name: string
  default_rate: number
  ignored: boolean
  created_at: string
}

export interface Session {
  id: string
  user_id: string
  patient_id: string | null
  calendar_event_id: string
  start_time: string
  paid: boolean
  amount: number
  paid_date: string | null
  created_at: string
  patient?: Patient
}

export interface SyncLog {
  id: string
  user_id: string
  synced_at: string
  events_fetched: number
}

export interface CalendarEvent {
  id: string
  summary: string
  start: { dateTime: string }
}

export interface PatientWithStats extends Patient {
  total_debt: number
  total_paid: number
  session_count: number
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test tests/lib/types.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts tests/lib/types.test.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 5: Google Calendar Sync Library

**Files:**
- Create: `lib/google-calendar.ts`
- Create: `tests/lib/google-calendar.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/google-calendar.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { matchEventsToPatients, extractUnknownNames } from '@/lib/google-calendar'
import type { CalendarEvent } from '@/lib/types'

const events: CalendarEvent[] = [
  { id: 'e1', summary: 'שרה כהן', start: { dateTime: '2026-05-06T10:00:00Z' } },
  { id: 'e2', summary: 'דני לוי', start: { dateTime: '2026-05-06T11:00:00Z' } },
  { id: 'e3', summary: 'ישיבת צוות', start: { dateTime: '2026-05-06T12:00:00Z' } },
]

describe('matchEventsToPatients', () => {
  it('returns matched events for known patient names', () => {
    const knownNames = new Set(['שרה כהן', 'דני לוי'])
    const { matched } = matchEventsToPatients(events, knownNames)
    expect(matched).toHaveLength(2)
    expect(matched.map((e) => e.summary)).toEqual(['שרה כהן', 'דני לוי'])
  })

  it('returns unmatched events for unknown names', () => {
    const knownNames = new Set(['שרה כהן'])
    const { unmatched } = matchEventsToPatients(events, knownNames)
    expect(unmatched).toHaveLength(2)
  })

  it('matching is exact and case-sensitive', () => {
    const knownNames = new Set(['שרה כהן '])  // trailing space
    const { matched } = matchEventsToPatients(events, knownNames)
    expect(matched).toHaveLength(0)
  })
})

describe('extractUnknownNames', () => {
  it('returns unique unknown names not in ignored or known sets', () => {
    const knownNames = new Set(['שרה כהן'])
    const ignoredNames = new Set(['ישיבת צוות'])
    const names = extractUnknownNames(events, knownNames, ignoredNames)
    expect(names).toEqual(['דני לוי'])
  })

  it('deduplicates names across multiple events', () => {
    const repeated: CalendarEvent[] = [
      ...events,
      { id: 'e4', summary: 'דני לוי', start: { dateTime: '2026-05-07T11:00:00Z' } },
    ]
    const names = extractUnknownNames(repeated, new Set(), new Set())
    expect(names.filter((n) => n === 'דני לוי')).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tests/lib/google-calendar.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/google-calendar'`

- [ ] **Step 3: Implement the library**

Create `lib/google-calendar.ts`:

```typescript
import { google } from 'googleapis'
import type { CalendarEvent } from './types'

export function createCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  return google.calendar({ version: 'v3', auth })
}

export async function fetchRecentEvents(
  accessToken: string,
  since: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
): Promise<CalendarEvent[]> {
  const calendar = createCalendarClient(accessToken)
  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: since.toISOString(),
    maxResults: 500,
    singleEvents: true,
    orderBy: 'startTime',
  })
  return (res.data.items ?? []).filter(
    (e): e is CalendarEvent =>
      !!(e.id && e.summary && e.start?.dateTime)
  )
}

export function matchEventsToPatients(
  events: CalendarEvent[],
  knownNames: Set<string>
): { matched: CalendarEvent[]; unmatched: CalendarEvent[] } {
  const matched: CalendarEvent[] = []
  const unmatched: CalendarEvent[] = []
  for (const event of events) {
    if (knownNames.has(event.summary)) {
      matched.push(event)
    } else {
      unmatched.push(event)
    }
  }
  return { matched, unmatched }
}

export function extractUnknownNames(
  events: CalendarEvent[],
  knownNames: Set<string>,
  ignoredNames: Set<string>
): string[] {
  const seen = new Set<string>()
  for (const event of events) {
    const name = event.summary
    if (!knownNames.has(name) && !ignoredNames.has(name)) {
      seen.add(name)
    }
  }
  return Array.from(seen)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/lib/google-calendar.test.ts
```

Expected: PASS — 5 tests

- [ ] **Step 5: Commit**

```bash
git add lib/google-calendar.ts tests/lib/google-calendar.test.ts
git commit -m "feat: add Google Calendar sync library with matching logic"
```

---

## Task 6: Patient DB Layer

**Files:**
- Create: `lib/db/patients.ts`
- Create: `tests/lib/db/patients.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/db/patients.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPatients,
  createPatient,
  updatePatientRate,
  ignorePatientName,
  getPatientNames,
  getIgnoredNames,
} from '@/lib/db/patients'

function makeMockSupabase(returnData: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: returnData, error }),
    then: undefined as unknown,
  }
  chain.order = vi.fn().mockResolvedValue({ data: returnData, error })
  return { from: vi.fn().mockReturnValue(chain), _chain: chain }
}

describe('getPatients', () => {
  it('returns non-ignored patients ordered by name', async () => {
    const patients = [{ id: '1', name: 'שרה כהן', default_rate: 150, ignored: false }]
    const { from, _chain } = makeMockSupabase(patients)
    const result = await getPatients(from as any)
    expect(result).toEqual(patients)
    expect(_chain.eq).toHaveBeenCalledWith('ignored', false)
  })
})

describe('createPatient', () => {
  it('inserts patient and returns it', async () => {
    const patient = { id: '1', name: 'שרה כהן', default_rate: 150 }
    const mock = { from: vi.fn() }
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: patient, error: null }),
    }
    mock.from.mockReturnValue(chain)
    const result = await createPatient(mock as any, 'שרה כהן', 150)
    expect(result).toEqual(patient)
    expect(chain.insert).toHaveBeenCalledWith({ name: 'שרה כהן', default_rate: 150 })
  })
})

describe('getPatientNames', () => {
  it('returns a Set of patient names', async () => {
    const mock = { from: vi.fn() }
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ name: 'שרה כהן' }, { name: 'דני לוי' }], error: null }),
    }
    mock.from.mockReturnValue(chain)
    const result = await getPatientNames(mock as any)
    expect(result).toEqual(new Set(['שרה כהן', 'דני לוי']))
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tests/lib/db/patients.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/patients'`

- [ ] **Step 3: Implement patient DB layer**

Create `lib/db/patients.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Patient, PatientWithStats } from '../types'

export async function getPatients(supabase: SupabaseClient): Promise<Patient[]> {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('ignored', false)
    .order('name')
  if (error) throw error
  return data
}

export async function createPatient(
  supabase: SupabaseClient,
  name: string,
  defaultRate: number
): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .insert({ name, default_rate: defaultRate })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updatePatientRate(
  supabase: SupabaseClient,
  id: string,
  defaultRate: number
): Promise<Patient> {
  const { data, error } = await supabase
    .from('patients')
    .update({ default_rate: defaultRate })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function ignorePatientName(
  supabase: SupabaseClient,
  name: string
): Promise<void> {
  const { error } = await supabase
    .from('patients')
    .insert({ name, default_rate: 0, ignored: true })
  if (error) throw error
}

export async function getPatientNames(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('patients')
    .select('name')
    .eq('ignored', false)
  if (error) throw error
  return new Set(data.map((p: { name: string }) => p.name))
}

export async function getIgnoredNames(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('patients')
    .select('name')
    .eq('ignored', true)
  if (error) throw error
  return new Set(data.map((p: { name: string }) => p.name))
}

export async function getPatientWithStats(
  supabase: SupabaseClient,
  id: string
): Promise<PatientWithStats> {
  const [patientRes, sessionsRes] = await Promise.all([
    supabase.from('patients').select('*').eq('id', id).single(),
    supabase.from('sessions').select('paid, amount').eq('patient_id', id),
  ])
  if (patientRes.error) throw patientRes.error
  if (sessionsRes.error) throw sessionsRes.error

  const sessions: { paid: boolean; amount: number }[] = sessionsRes.data
  const total_debt = sessions.filter((s) => !s.paid).reduce((sum, s) => sum + s.amount, 0)
  const total_paid = sessions.filter((s) => s.paid).reduce((sum, s) => sum + s.amount, 0)

  return {
    ...patientRes.data,
    total_debt,
    total_paid,
    session_count: sessions.length,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/lib/db/patients.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add lib/db/patients.ts tests/lib/db/patients.test.ts
git commit -m "feat: add patient DB layer"
```

---

## Task 7: Session DB Layer

**Files:**
- Create: `lib/db/sessions.ts`
- Create: `tests/lib/db/sessions.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/db/sessions.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { getSessionStats } from '@/lib/db/sessions'

describe('getSessionStats', () => {
  it('calculates totalDebt, todayCount, unpaidCount from session data', async () => {
    const today = new Date()
    const todayISO = today.toISOString()

    const unpaidSessions = [
      { amount: 150, start_time: todayISO },
      { amount: 200, start_time: todayISO },
      { amount: 300, start_time: new Date('2026-04-01').toISOString() },
    ]
    const todaySessions = [{ id: '1' }, { id: '2' }]

    const mock = { from: vi.fn() }
    let callCount = 0
    mock.from.mockImplementation(() => {
      callCount++
      const data = callCount === 1 ? unpaidSessions : todaySessions
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lt: vi.fn().mockResolvedValue({ data, error: null }),
      }
    })

    const result = await getSessionStats(mock as any)
    expect(result.totalDebt).toBe(650)
    expect(result.unpaidCount).toBe(3)
    expect(result.todayCount).toBe(2)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/lib/db/sessions.test.ts
```

Expected: FAIL — `Cannot find module '@/lib/db/sessions'`

- [ ] **Step 3: Implement session DB layer**

Create `lib/db/sessions.ts`:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Session } from '../types'

export async function getTodaySessions(supabase: SupabaseClient): Promise<Session[]> {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const { data, error } = await supabase
    .from('sessions')
    .select('*, patient:patients(*)')
    .gte('start_time', start)
    .lt('start_time', end)
    .not('patient_id', 'is', null)
    .order('start_time')
  if (error) throw error
  return data
}

export async function getUnpaidSessions(supabase: SupabaseClient): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*, patient:patients(*)')
    .eq('paid', false)
    .not('patient_id', 'is', null)
    .order('start_time', { ascending: false })
  if (error) throw error
  return data
}

export async function getPatientSessions(
  supabase: SupabaseClient,
  patientId: string
): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('patient_id', patientId)
    .order('start_time', { ascending: false })
  if (error) throw error
  return data
}

export async function markSessionPaid(
  supabase: SupabaseClient,
  id: string,
  amount: number,
  paidDate: string
): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .update({ paid: true, amount, paid_date: paidDate })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function upsertSession(
  supabase: SupabaseClient,
  session: {
    user_id: string
    calendar_event_id: string
    patient_id: string
    start_time: string
    amount: number
  }
): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .upsert(session, { onConflict: 'user_id,calendar_event_id', ignoreDuplicates: true })
  if (error) throw error
}

export async function getSessionStats(supabase: SupabaseClient): Promise<{
  totalDebt: number
  todayCount: number
  unpaidCount: number
}> {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString()
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString()

  const [unpaidRes, todayRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('amount')
      .eq('paid', false)
      .not('patient_id', 'is', null),
    supabase
      .from('sessions')
      .select('id')
      .gte('start_time', start)
      .lt('start_time', end)
      .not('patient_id', 'is', null),
  ])

  if (unpaidRes.error) throw unpaidRes.error
  if (todayRes.error) throw todayRes.error

  const totalDebt = unpaidRes.data.reduce(
    (sum: number, s: { amount: number }) => sum + s.amount,
    0
  )

  return {
    totalDebt,
    unpaidCount: unpaidRes.data.length,
    todayCount: todayRes.data.length,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/lib/db/sessions.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/db/sessions.ts tests/lib/db/sessions.test.ts
git commit -m "feat: add session DB layer"
```

---

## Task 8: API Routes

**Files:**
- Create: `app/api/calendar/sync/route.ts`
- Create: `app/api/sessions/[id]/route.ts`
- Create: `app/api/patients/route.ts`
- Create: `app/api/patients/[id]/route.ts`

- [ ] **Step 1: Create calendar sync route**

Create `app/api/calendar/sync/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchRecentEvents, matchEventsToPatients, extractUnknownNames } from '@/lib/google-calendar'
import { getPatientNames, getIgnoredNames } from '@/lib/db/patients'
import { upsertSession } from '@/lib/db/sessions'

export async function POST() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const accessToken = session.provider_token
  if (!accessToken) {
    return NextResponse.json({ error: 'No Google access token' }, { status: 400 })
  }

  const [knownNames, ignoredNames] = await Promise.all([
    getPatientNames(supabase),
    getIgnoredNames(supabase),
  ])

  const events = await fetchRecentEvents(accessToken)
  const { matched } = matchEventsToPatients(events, knownNames)
  const unknownNames = extractUnknownNames(events, knownNames, ignoredNames)

  const { data: patients } = await supabase
    .from('patients')
    .select('id, name')
    .eq('ignored', false)

  const patientMap = new Map(
    (patients ?? []).map((p: { id: string; name: string }) => [p.name, p.id])
  )

  for (const event of matched) {
    const patientId = patientMap.get(event.summary)
    if (!patientId) continue
    const { data: patient } = await supabase
      .from('patients')
      .select('default_rate')
      .eq('id', patientId)
      .single()
    await upsertSession(supabase, {
      user_id: session.user.id,
      calendar_event_id: event.id,
      patient_id: patientId,
      start_time: event.start.dateTime,
      amount: patient?.default_rate ?? 0,
    })
  }

  await supabase.from('sync_log').insert({ events_fetched: events.length })

  return NextResponse.json({ synced: matched.length, unknownNames })
}
```

- [ ] **Step 2: Create session PATCH route**

Create `app/api/sessions/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { markSessionPaid } from '@/lib/db/sessions'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { amount, paid_date } = await request.json()

  if (typeof amount !== 'number' || !paid_date) {
    return NextResponse.json({ error: 'amount and paid_date required' }, { status: 400 })
  }

  const session = await markSessionPaid(supabase, id, amount, paid_date)
  return NextResponse.json(session)
}
```

- [ ] **Step 3: Create patients list + create route**

Create `app/api/patients/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPatients, createPatient, ignorePatientName } from '@/lib/db/patients'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const patients = await getPatients(supabase)
  return NextResponse.json(patients)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, default_rate, ignored } = await request.json()

  if (!name) {
    return NextResponse.json({ error: 'name required' }, { status: 400 })
  }

  if (ignored) {
    await ignorePatientName(supabase, name)
    return NextResponse.json({ ignored: true })
  }

  const patient = await createPatient(supabase, name, default_rate ?? 0)
  return NextResponse.json(patient)
}
```

- [ ] **Step 4: Create patient update route**

Create `app/api/patients/[id]/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updatePatientRate, getPatientWithStats } from '@/lib/db/patients'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const patient = await getPatientWithStats(supabase, id)
  return NextResponse.json(patient)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { default_rate } = await request.json()

  if (typeof default_rate !== 'number') {
    return NextResponse.json({ error: 'default_rate must be a number' }, { status: 400 })
  }

  const patient = await updatePatientRate(supabase, id, default_rate)
  return NextResponse.json(patient)
}
```

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "feat: add API routes for calendar sync, sessions, and patients"
```

---

## Task 9: Google OAuth Login + Auth Callback

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/auth/callback/route.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create login page**

Create `app/login/page.tsx`:

```tsx
'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  async function signIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar.readonly',
      },
    })
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6" dir="rtl">
      <div className="text-4xl mb-4">📅</div>
      <h1 className="text-white text-2xl font-bold mb-2">ברוכה הבאה, עדי</h1>
      <p className="text-gray-400 text-sm text-center mb-8 leading-relaxed">
        חברי את יומן Google שלך כדי שהאפליקציה<br />תוכל לזהות פגישות אוטומטית
      </p>
      <button
        onClick={signIn}
        className="w-full max-w-xs bg-blue-600 text-white rounded-xl py-4 text-base font-medium"
      >
        🔗 חיבור Google Calendar
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create OAuth callback handler**

Create `app/auth/callback/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { count } = await supabase
          .from('patients')
          .select('*', { count: 'exact', head: true })

        if (count === 0) {
          return NextResponse.redirect(`${origin}/onboarding`)
        }
        return NextResponse.redirect(`${origin}/sessions`)
      }
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

- [ ] **Step 3: Create root redirect**

Replace contents of `app/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { count } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })

  if (count === 0) redirect('/onboarding')
  redirect('/sessions')
}
```

- [ ] **Step 4: Commit**

```bash
git add app/login/ app/auth/ app/page.tsx
git commit -m "feat: add Google OAuth login flow and auth callback"
```

---

## Task 10: App Layout + Bottom Navigation

**Files:**
- Modify: `app/layout.tsx`
- Create: `components/BottomNav.tsx`
- Create: `tests/components/BottomNav.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/BottomNav.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BottomNav } from '@/components/BottomNav'

vi.mock('next/navigation', () => ({
  usePathname: () => '/sessions',
}))

describe('BottomNav', () => {
  it('renders both tabs', () => {
    render(<BottomNav />)
    expect(screen.getByText('פגישות')).toBeInTheDocument()
    expect(screen.getByText('מטופלים')).toBeInTheDocument()
  })

  it('highlights the active tab', () => {
    render(<BottomNav />)
    const sessionsLink = screen.getByText('פגישות').closest('a')
    expect(sessionsLink).toHaveClass('text-blue-400')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/components/BottomNav.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/BottomNav'`

- [ ] **Step 3: Create BottomNav component**

Create `components/BottomNav.tsx`:

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function BottomNav() {
  const pathname = usePathname()

  if (pathname === '/login' || pathname === '/onboarding') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around py-3 z-40">
      <Link
        href="/sessions"
        className={`flex flex-col items-center text-xs gap-0.5 ${
          pathname.startsWith('/sessions') ? 'text-blue-400' : 'text-gray-500'
        }`}
      >
        <span>📅</span>
        <span>פגישות</span>
      </Link>
      <Link
        href="/patients"
        className={`flex flex-col items-center text-xs gap-0.5 ${
          pathname.startsWith('/patients') ? 'text-blue-400' : 'text-gray-500'
        }`}
      >
        <span>👤</span>
        <span>מטופלים</span>
      </Link>
    </nav>
  )
}
```

- [ ] **Step 4: Update root layout**

Replace contents of `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { BottomNav } from '@/components/BottomNav'

export const metadata: Metadata = { title: 'ניהול תשלומים' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Sans+Hebrew:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-white font-sans min-h-screen pb-16">
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
```

- [ ] **Step 5: Set dark background in globals.css**

In `app/globals.css`, add after the existing Tailwind directives:

```css
body {
  background-color: #1a1a2e;
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test tests/components/BottomNav.test.tsx
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add app/layout.tsx app/globals.css components/BottomNav.tsx tests/components/BottomNav.test.tsx
git commit -m "feat: add app layout with Hebrew RTL and bottom navigation"
```

---

## Task 11: Home Screen — Sessions Tab

**Files:**
- Create: `components/StatsBar.tsx`
- Create: `components/SessionRow.tsx`
- Create: `components/SessionList.tsx`
- Create: `app/sessions/page.tsx`
- Create: `tests/components/StatsBar.test.tsx`
- Create: `tests/components/SessionRow.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/components/StatsBar.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StatsBar } from '@/components/StatsBar'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

describe('StatsBar', () => {
  it('displays all three stats', () => {
    render(<StatsBar totalDebt={750} todayCount={3} unpaidCount={2} />)
    expect(screen.getByText('₪750')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('clicking debt button navigates to patients filtered by חייבים', async () => {
    render(<StatsBar totalDebt={750} todayCount={3} unpaidCount={2} />)
    await userEvent.click(screen.getByText('₪750').closest('button')!)
    expect(mockPush).toHaveBeenCalledWith('/patients?filter=חייבים')
  })
})
```

Create `tests/components/SessionRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionRow } from '@/components/SessionRow'
import type { Session } from '@/lib/types'

const session: Session = {
  id: '1', user_id: 'u1', patient_id: 'p1',
  calendar_event_id: 'ev1', start_time: '2026-05-06T10:00:00Z',
  paid: false, amount: 150, paid_date: null, created_at: '2026-01-01',
  patient: { id: 'p1', user_id: 'u1', name: 'שרה כהן', default_rate: 150, ignored: false, created_at: '2026-01-01' },
}

describe('SessionRow', () => {
  it('shows patient name, time, and unpaid amount', () => {
    render(<SessionRow session={session} onTap={vi.fn()} />)
    expect(screen.getByText('שרה כהן')).toBeInTheDocument()
    expect(screen.getByText('10:00')).toBeInTheDocument()
    expect(screen.getByText('₪150')).toBeInTheDocument()
  })

  it('calls onTap when clicked', async () => {
    const onTap = vi.fn()
    render(<SessionRow session={session} onTap={onTap} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onTap).toHaveBeenCalledWith(session)
  })

  it('shows green checkmark badge for paid session', () => {
    const paid = { ...session, paid: true }
    render(<SessionRow session={paid} onTap={vi.fn()} />)
    expect(screen.getByText('₪150 ✓')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test tests/components/StatsBar.test.tsx tests/components/SessionRow.test.tsx
```

Expected: FAIL — modules not found

- [ ] **Step 3: Create StatsBar**

Create `components/StatsBar.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'

interface Props {
  totalDebt: number
  todayCount: number
  unpaidCount: number
}

export function StatsBar({ totalDebt, todayCount, unpaidCount }: Props) {
  const router = useRouter()
  const goToDebtors = () => router.push('/patients?filter=חייבים')

  return (
    <div className="flex gap-2 mb-4">
      <button onClick={goToDebtors} className="flex-1 bg-card rounded-xl p-3 text-center">
        <span className="block text-lg font-bold text-red-400">₪{totalDebt}</span>
        <span className="block text-xs text-gray-400 mt-0.5">חוב כולל</span>
      </button>
      <div className="flex-1 bg-card rounded-xl p-3 text-center">
        <span className="block text-lg font-bold text-green-400">{todayCount}</span>
        <span className="block text-xs text-gray-400 mt-0.5">פגישות היום</span>
      </div>
      <button onClick={goToDebtors} className="flex-1 bg-card rounded-xl p-3 text-center">
        <span className="block text-lg font-bold text-amber-400">{unpaidCount}</span>
        <span className="block text-xs text-gray-400 mt-0.5">לא שילמו</span>
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Create SessionRow**

Create `components/SessionRow.tsx`:

```tsx
'use client'
import { format } from 'date-fns'
import type { Session } from '@/lib/types'

interface Props {
  session: Session
  onTap: (session: Session) => void
}

export function SessionRow({ session, onTap }: Props) {
  const time = format(new Date(session.start_time), 'HH:mm')

  return (
    <button
      onClick={() => onTap(session)}
      className="w-full bg-card rounded-lg px-3 py-2.5 mb-1.5 flex justify-between items-center text-right"
    >
      <span
        className={`rounded-md px-2 py-1 text-xs font-bold ${
          session.paid
            ? 'bg-green-900/40 text-green-400 border border-green-700/50'
            : 'bg-red-900/40 text-red-400 border border-red-700/50'
        }`}
      >
        {session.paid ? `₪${session.amount} ✓` : `₪${session.amount}`}
      </span>
      <div>
        <div className="text-white text-sm">{session.patient?.name}</div>
        <div className="text-gray-400 text-xs mt-0.5">{time}</div>
      </div>
    </button>
  )
}
```

- [ ] **Step 5: Create SessionList**

Create `components/SessionList.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { SessionRow } from './SessionRow'
import type { Session } from '@/lib/types'

type Tab = 'today' | 'unpaid'

interface Props {
  todaySessions: Session[]
  unpaidSessions: Session[]
  onSessionTap: (session: Session) => void
}

export function SessionList({ todaySessions, unpaidSessions, onSessionTap }: Props) {
  const [tab, setTab] = useState<Tab>('today')
  const sessions = tab === 'today' ? todaySessions : unpaidSessions

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {(['today', 'unpaid'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm ${
              tab === t
                ? 'bg-blue-600 text-white'
                : 'bg-card-hover text-gray-400'
            }`}
          >
            {t === 'today' ? 'היום' : 'לא שולם'}
          </button>
        ))}
      </div>
      {sessions.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">אין פגישות להצגה</p>
      ) : (
        sessions.map((s) => (
          <SessionRow key={s.id} session={s} onTap={onSessionTap} />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 6: Create sessions page**

Create `app/sessions/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { getTodaySessions, getUnpaidSessions, getSessionStats } from '@/lib/db/sessions'
import { StatsBar } from '@/components/StatsBar'
import { SessionsClient } from './SessionsClient'

export default async function SessionsPage() {
  const supabase = await createClient()
  const [todaySessions, unpaidSessions, stats] = await Promise.all([
    getTodaySessions(supabase),
    getUnpaidSessions(supabase),
    getSessionStats(supabase),
  ])

  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      <StatsBar
        totalDebt={stats.totalDebt}
        todayCount={stats.todayCount}
        unpaidCount={stats.unpaidCount}
      />
      <SessionsClient
        todaySessions={todaySessions}
        unpaidSessions={unpaidSessions}
      />
    </main>
  )
}
```

Create `app/sessions/SessionsClient.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { SessionList } from '@/components/SessionList'
import { PaymentSheet } from '@/components/PaymentSheet'
import type { Session } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface Props {
  todaySessions: Session[]
  unpaidSessions: Session[]
}

export function SessionsClient({ todaySessions, unpaidSessions }: Props) {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const router = useRouter()

  async function handleConfirmPayment(sessionId: string, amount: number, date: string) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, paid_date: date }),
    })
    router.refresh()
  }

  return (
    <>
      <SessionList
        todaySessions={todaySessions}
        unpaidSessions={unpaidSessions}
        onSessionTap={setActiveSession}
      />
      <PaymentSheet
        session={activeSession}
        onClose={() => setActiveSession(null)}
        onConfirm={handleConfirmPayment}
      />
    </>
  )
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npm test tests/components/StatsBar.test.tsx tests/components/SessionRow.test.tsx
```

Expected: PASS — 5 tests

- [ ] **Step 8: Commit**

```bash
git add components/StatsBar.tsx components/SessionRow.tsx components/SessionList.tsx \
  app/sessions/ tests/components/StatsBar.test.tsx tests/components/SessionRow.test.tsx
git commit -m "feat: add home screen with stats bar and session list"
```

---

## Task 12: Payment Bottom Sheet

**Files:**
- Create: `components/PaymentSheet.tsx`
- Create: `tests/components/PaymentSheet.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/PaymentSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentSheet } from '@/components/PaymentSheet'
import type { Session } from '@/lib/types'

const session: Session = {
  id: '1', user_id: 'u1', patient_id: 'p1',
  calendar_event_id: 'ev1', start_time: '2026-05-06T10:00:00Z',
  paid: false, amount: 150, paid_date: null, created_at: '2026-01-01',
  patient: { id: 'p1', user_id: 'u1', name: 'שרה כהן', default_rate: 150, ignored: false, created_at: '2026-01-01' },
}

describe('PaymentSheet', () => {
  it('renders nothing when session is null', () => {
    const { container } = render(
      <PaymentSheet session={null} onClose={vi.fn()} onConfirm={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('shows patient name and pre-filled amount', () => {
    render(<PaymentSheet session={session} onClose={vi.fn()} onConfirm={vi.fn()} />)
    expect(screen.getByText(/שרה כהן/)).toBeInTheDocument()
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
  })

  it('calls onConfirm with amount and date on submit', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined)
    render(<PaymentSheet session={session} onClose={vi.fn()} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByText('אישור תשלום ✓'))
    expect(onConfirm).toHaveBeenCalledWith('1', 150, expect.stringMatching(/\d{4}-\d{2}-\d{2}/))
  })

  it('calls onClose when backdrop is clicked', async () => {
    const onClose = vi.fn()
    render(<PaymentSheet session={session} onClose={onClose} onConfirm={vi.fn()} />)
    const backdrop = document.querySelector('.absolute.inset-0')!
    await userEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/components/PaymentSheet.test.tsx
```

Expected: FAIL — `Cannot find module '@/components/PaymentSheet'`

- [ ] **Step 3: Create PaymentSheet**

Create `components/PaymentSheet.tsx`:

```tsx
'use client'
import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import type { Session } from '@/lib/types'

interface Props {
  session: Session | null
  onClose: () => void
  onConfirm: (sessionId: string, amount: number, date: string) => Promise<void>
}

export function PaymentSheet({ session, onClose, onConfirm }: Props) {
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      setAmount(session.amount)
      setDate(format(new Date(), 'yyyy-MM-dd'))
    }
  }, [session])

  if (!session) return null

  async function handleConfirm() {
    setLoading(true)
    await onConfirm(session!.id, amount, date)
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50" dir="rtl">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-2xl p-5 border-t border-gray-700">
        <div className="w-8 h-0.5 bg-gray-600 rounded mx-auto mb-4" />
        <h3 className="text-white font-bold text-base mb-4 text-right">
          רישום תשלום — {session.patient?.name}
        </h3>
        <label className="text-gray-500 text-xs block mb-1 text-right">סכום (₪)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-right mb-3"
        />
        <label className="text-gray-500 text-xs block mb-1 text-right">תאריך תשלום</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-right mb-5"
        />
        <button
          onClick={handleConfirm}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-medium disabled:opacity-50"
        >
          {loading ? '...' : 'אישור תשלום ✓'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test tests/components/PaymentSheet.test.tsx
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add components/PaymentSheet.tsx tests/components/PaymentSheet.test.tsx
git commit -m "feat: add payment bottom sheet"
```

---

## Task 13: Patients Tab

**Files:**
- Create: `components/PatientRow.tsx`
- Create: `components/PatientList.tsx`
- Create: `app/patients/page.tsx`
- Create: `tests/components/PatientRow.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/PatientRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PatientRow } from '@/components/PatientRow'
import type { PatientWithStats } from '@/lib/types'

const patient: PatientWithStats = {
  id: '1', user_id: 'u1', name: 'שרה כהן', default_rate: 150,
  ignored: false, created_at: '2026-01-01',
  total_debt: 300, total_paid: 900, session_count: 8,
}

describe('PatientRow', () => {
  it('shows name, rate, session count, and debt', () => {
    render(<PatientRow patient={patient} onClick={vi.fn()} />)
    expect(screen.getByText('שרה כהן')).toBeInTheDocument()
    expect(screen.getByText('₪150')).toBeInTheDocument()
    expect(screen.getByText('8 פגישות')).toBeInTheDocument()
    expect(screen.getByText('₪300')).toBeInTheDocument()
  })

  it('calls onClick when row is tapped', async () => {
    const onClick = vi.fn()
    render(<PatientRow patient={patient} onClick={onClick} />)
    await userEvent.click(screen.getByRole('button'))
    expect(onClick).toHaveBeenCalledWith('1')
  })

  it('shows green text when no debt', () => {
    render(<PatientRow patient={{ ...patient, total_debt: 0 }} onClick={vi.fn()} />)
    expect(screen.getByText('שילם ✓')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/components/PatientRow.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Create PatientRow**

Create `components/PatientRow.tsx`:

```tsx
'use client'
import type { PatientWithStats } from '@/lib/types'

interface Props {
  patient: PatientWithStats
  onClick: (id: string) => void
}

export function PatientRow({ patient, onClick }: Props) {
  return (
    <button
      onClick={() => onClick(patient.id)}
      className="w-full bg-card rounded-lg px-3 py-2.5 mb-1.5 flex justify-between items-center text-right"
    >
      <div className="text-left">
        {patient.total_debt > 0 ? (
          <span className="text-red-400 text-sm font-bold">₪{patient.total_debt}</span>
        ) : (
          <span className="text-green-400 text-sm font-bold">שילם ✓</span>
        )}
        <div className="text-gray-500 text-xs mt-0.5">{patient.session_count} פגישות</div>
      </div>
      <div>
        <div className="text-white text-sm">{patient.name}</div>
        <div className="text-gray-400 text-xs mt-0.5">₪{patient.default_rate} לפגישה</div>
      </div>
    </button>
  )
}
```

- [ ] **Step 4: Create PatientList**

Create `components/PatientList.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PatientRow } from './PatientRow'
import type { PatientWithStats } from '@/lib/types'

type Filter = 'כולם' | 'חייבים' | 'שילם'

interface Props {
  patients: PatientWithStats[]
  initialFilter?: string
}

export function PatientList({ patients, initialFilter = 'כולם' }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>(initialFilter as Filter)
  const router = useRouter()

  const filtered = patients.filter((p) => {
    const matchesSearch = p.name.includes(search)
    const matchesFilter =
      filter === 'כולם' ||
      (filter === 'חייבים' && p.total_debt > 0) ||
      (filter === 'שילם' && p.total_debt === 0)
    return matchesSearch && matchesFilter
  })

  const counts = {
    כולם: patients.length,
    חייבים: patients.filter((p) => p.total_debt > 0).length,
    שילם: patients.filter((p) => p.total_debt === 0).length,
  }

  return (
    <div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 חיפוש מטופל..."
        className="w-full bg-card-hover border border-gray-700 rounded-lg px-3 py-2.5 text-white text-right mb-3 placeholder-gray-600"
      />
      <div className="flex gap-2 mb-4 flex-wrap">
        {(['כולם', 'חייבים', 'שילם'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs ${
              filter === f
                ? 'bg-blue-600/30 border border-blue-500 text-blue-300'
                : 'bg-card-hover border border-gray-700 text-gray-400'
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>
      {filtered.map((p) => (
        <PatientRow
          key={p.id}
          patient={p}
          onClick={(id) => router.push(`/patients/${id}`)}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Create patients page**

Create `app/patients/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { getPatients } from '@/lib/db/patients'
import { PatientList } from '@/components/PatientList'
import type { PatientWithStats } from '@/lib/types'

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const supabase = await createClient()
  const { filter } = await searchParams

  const patients = await getPatients(supabase)

  const patientsWithStats: PatientWithStats[] = await Promise.all(
    patients.map(async (p) => {
      const sessionsRes = await supabase
        .from('sessions')
        .select('paid, amount')
        .eq('patient_id', p.id)
      const sessions: { paid: boolean; amount: number }[] = sessionsRes.data ?? []
      return {
        ...p,
        total_debt: sessions.filter((s) => !s.paid).reduce((sum, s) => sum + s.amount, 0),
        total_paid: sessions.filter((s) => s.paid).reduce((sum, s) => sum + s.amount, 0),
        session_count: sessions.length,
      }
    })
  )

  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      <PatientList patients={patientsWithStats} initialFilter={filter ?? 'כולם'} />
    </main>
  )
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test tests/components/PatientRow.test.tsx
```

Expected: PASS — 3 tests

- [ ] **Step 7: Commit**

```bash
git add components/PatientRow.tsx components/PatientList.tsx app/patients/page.tsx \
  tests/components/PatientRow.test.tsx
git commit -m "feat: add patients tab with search and filter"
```

---

## Task 14: Patient Detail Page

**Files:**
- Create: `components/RateCard.tsx`
- Create: `app/patients/[id]/page.tsx`
- Create: `tests/components/RateCard.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `tests/components/RateCard.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RateCard } from '@/components/RateCard'

describe('RateCard', () => {
  it('shows the current rate', () => {
    render(<RateCard patientId="1" defaultRate={150} onUpdate={vi.fn()} />)
    expect(screen.getByText('₪150')).toBeInTheDocument()
  })

  it('reveals edit input when עריכה is clicked', async () => {
    render(<RateCard patientId="1" defaultRate={150} onUpdate={vi.fn()} />)
    await userEvent.click(screen.getByText('עריכה ✎'))
    expect(screen.getByDisplayValue('150')).toBeInTheDocument()
    expect(screen.getByText('שמירה')).toBeInTheDocument()
  })

  it('calls onUpdate with new rate when saved', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined)
    render(<RateCard patientId="1" defaultRate={150} onUpdate={onUpdate} />)
    await userEvent.click(screen.getByText('עריכה ✎'))
    const input = screen.getByDisplayValue('150')
    await userEvent.clear(input)
    await userEvent.type(input, '200')
    await userEvent.click(screen.getByText('שמירה'))
    expect(onUpdate).toHaveBeenCalledWith(200)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test tests/components/RateCard.test.tsx
```

Expected: FAIL — module not found

- [ ] **Step 3: Create RateCard**

Create `components/RateCard.tsx`:

```tsx
'use client'
import { useState } from 'react'

interface Props {
  patientId: string
  defaultRate: number
  onUpdate: (newRate: number) => Promise<void>
}

export function RateCard({ defaultRate, onUpdate }: Props) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(defaultRate)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    setLoading(true)
    await onUpdate(value)
    setLoading(false)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="bg-card-hover border border-blue-600/40 rounded-xl p-3 mb-4">
        <p className="text-gray-500 text-xs text-right mb-2">עריכת מחיר לפגישה</p>
        <div className="flex justify-between items-center gap-2">
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="border border-gray-600 text-gray-400 rounded-lg px-3 py-1.5 text-xs"
            >
              ביטול
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-xs disabled:opacity-50"
            >
              שמירה
            </button>
          </div>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="bg-card border border-gray-600 rounded-lg px-3 py-1.5 text-white text-center w-24"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl p-3 mb-4 flex justify-between items-center">
      <button
        onClick={() => setEditing(true)}
        className="bg-blue-900/50 border border-blue-600/50 text-blue-300 rounded-lg px-3 py-1 text-xs"
      >
        עריכה ✎
      </button>
      <div className="text-right">
        <p className="text-gray-400 text-xs">מחיר ברירת מחדל לפגישה</p>
        <p className="text-white text-base font-bold">₪{defaultRate}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create patient detail page**

Create `app/patients/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPatientWithStats } from '@/lib/db/patients'
import { getPatientSessions } from '@/lib/db/sessions'
import { PatientDetailClient } from './PatientDetailClient'

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [patient, sessions] = await Promise.all([
    getPatientWithStats(supabase, id).catch(() => null),
    getPatientSessions(supabase, id),
  ])

  if (!patient) notFound()

  return (
    <main className="px-4 pt-5 pb-4" dir="rtl">
      <PatientDetailClient patient={patient} sessions={sessions} />
    </main>
  )
}
```

Create `app/patients/[id]/PatientDetailClient.tsx`:

```tsx
'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { format } from 'date-fns'
import { RateCard } from '@/components/RateCard'
import { PaymentSheet } from '@/components/PaymentSheet'
import type { PatientWithStats, Session } from '@/lib/types'

interface Props {
  patient: PatientWithStats
  sessions: Session[]
}

export function PatientDetailClient({ patient, sessions }: Props) {
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const router = useRouter()

  async function handleRateUpdate(newRate: number) {
    await fetch(`/api/patients/${patient.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ default_rate: newRate }),
    })
    router.refresh()
  }

  async function handleConfirmPayment(sessionId: string, amount: number, date: string) {
    await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, paid_date: date }),
    })
    router.refresh()
  }

  const sessionsWithPatient = sessions.map((s) => ({ ...s, patient }))

  return (
    <>
      <button onClick={() => router.back()} className="text-blue-400 text-sm mb-3 block">
        ← חזרה
      </button>
      <h1 className="text-white text-xl font-bold mb-3">{patient.name}</h1>

      <RateCard
        patientId={patient.id}
        defaultRate={patient.default_rate}
        onUpdate={handleRateUpdate}
      />

      <div className="flex gap-2 mb-5">
        {[
          { label: 'חוב נוכחי', value: `₪${patient.total_debt}`, color: 'text-red-400' },
          { label: 'שולם סה"כ', value: `₪${patient.total_paid}`, color: 'text-green-400' },
          { label: 'פגישות', value: String(patient.session_count), color: 'text-gray-300' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex-1 bg-card rounded-xl p-3 text-center">
            <span className={`block text-base font-bold ${color}`}>{value}</span>
            <span className="block text-xs text-gray-400 mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-gray-500 text-xs mb-2">היסטוריית פגישות</p>
      {sessions.map((s) => (
        <button
          key={s.id}
          onClick={() => !s.paid && setActiveSession({ ...s, patient })}
          className="w-full bg-card rounded-lg px-3 py-2.5 mb-1.5 flex justify-between items-center text-right"
        >
          <span
            className={`rounded-md px-2 py-1 text-xs font-bold ${
              s.paid
                ? 'bg-green-900/40 text-green-400 border border-green-700/50'
                : 'bg-red-900/40 text-red-400 border border-red-700/50'
            }`}
          >
            {s.paid ? `₪${s.amount} ✓` : `₪${s.amount}`}
          </span>
          <div>
            <div className="text-white text-sm">
              {format(new Date(s.start_time), 'd בMMMM yyyy', { locale: undefined })}
            </div>
            <div className="text-gray-400 text-xs mt-0.5">
              {format(new Date(s.start_time), 'HH:mm')}
            </div>
          </div>
        </button>
      ))}

      <PaymentSheet
        session={activeSession}
        onClose={() => setActiveSession(null)}
        onConfirm={handleConfirmPayment}
      />
    </>
  )
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test tests/components/RateCard.test.tsx
```

Expected: PASS — 3 tests

- [ ] **Step 6: Commit**

```bash
git add components/RateCard.tsx app/patients/[id]/ tests/components/RateCard.test.tsx
git commit -m "feat: add patient detail page with editable rate and session history"
```

---

## Task 15: Onboarding Flow

**Files:**
- Create: `components/OnboardingFlow/index.tsx`
- Create: `components/OnboardingFlow/StepConnect.tsx`
- Create: `components/OnboardingFlow/StepSync.tsx`
- Create: `components/OnboardingFlow/StepLinkPatients.tsx`
- Create: `app/onboarding/page.tsx`

- [ ] **Step 1: Create StepConnect**

Create `components/OnboardingFlow/StepConnect.tsx`:

```tsx
'use client'

interface Props {
  onNext: () => void
}

export function StepConnect({ onNext }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-5xl mb-5">📅</div>
      <h1 className="text-white text-2xl font-bold mb-2 text-center">ברוכה הבאה, עדי</h1>
      <p className="text-gray-400 text-sm text-center mb-10 leading-relaxed">
        חברי את יומן Google שלך כדי שהאפליקציה<br />תוכל לזהות פגישות אוטומטית
      </p>
      <button
        onClick={onNext}
        className="w-full max-w-xs bg-blue-600 text-white rounded-xl py-4 text-base font-medium"
      >
        🔗 חיבור Google Calendar
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Create StepSync**

Create `components/OnboardingFlow/StepSync.tsx`:

```tsx
'use client'
import { useEffect, useState } from 'react'

interface Props {
  onNext: (unknownNames: string[]) => void
}

export function StepSync({ onNext }: Props) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/calendar/sync', { method: 'POST' })
      .then((r) => r.json())
      .then((data: { synced: number; unknownNames: string[] }) => {
        setCount(data.synced)
        setTimeout(() => onNext(data.unknownNames), 800)
      })
  }, [onNext])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="text-4xl mb-5">⏳</div>
      <h2 className="text-white text-lg font-bold mb-2">טוען פגישות...</h2>
      <p className="text-gray-400 text-sm mb-6">מושך פגישות מ־30 הימים האחרונים</p>
      {count !== null && (
        <div className="bg-card rounded-lg px-5 py-3 text-blue-300 text-sm">
          נמצאו {count} פגישות
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create StepLinkPatients**

Create `components/OnboardingFlow/StepLinkPatients.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface NameEntry {
  name: string
  rate: string
  dismissed: boolean
}

interface Props {
  unknownNames: string[]
}

export function StepLinkPatients({ unknownNames }: Props) {
  const router = useRouter()
  const [entries, setEntries] = useState<NameEntry[]>(
    unknownNames.map((name) => ({ name, rate: '', dismissed: false }))
  )
  const [saving, setSaving] = useState(false)

  function toggleDismiss(index: number) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, dismissed: !e.dismissed } : e))
    )
  }

  function setRate(index: number, rate: string) {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, rate } : e))
    )
  }

  async function handleFinish() {
    setSaving(true)
    await Promise.all(
      entries.map((entry) =>
        fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: entry.name,
            default_rate: entry.dismissed ? 0 : Number(entry.rate) || 0,
            ignored: entry.dismissed,
          }),
        })
      )
    )
    router.push('/sessions')
  }

  if (unknownNames.length === 0) {
    router.push('/sessions')
    return null
  }

  return (
    <div className="px-4 pt-8 pb-6 min-h-screen" dir="rtl">
      <h2 className="text-white text-lg font-bold mb-1">זיהוי מטופלים</h2>
      <p className="text-gray-400 text-sm mb-5">
        נמצאו {unknownNames.length} שמות חדשים ביומן
      </p>

      {entries.map((entry, i) =>
        entry.dismissed ? (
          <div
            key={entry.name}
            className="bg-card-hover border border-gray-700 rounded-xl p-3 mb-3 opacity-50"
          >
            <div className="flex justify-between items-center">
              <button
                onClick={() => toggleDismiss(i)}
                className="border border-gray-600 text-blue-400 rounded-lg px-3 py-1 text-xs"
              >
                בטל ↩
              </button>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm line-through">{entry.name}</span>
                <span className="bg-gray-700 text-gray-500 rounded px-2 py-0.5 text-xs">לא מטופל</span>
              </div>
            </div>
          </div>
        ) : (
          <div
            key={entry.name}
            className="bg-card-hover border border-blue-600/30 rounded-xl p-3 mb-3"
          >
            <div className="flex justify-between items-center mb-2">
              <button
                onClick={() => toggleDismiss(i)}
                className="border border-gray-600 text-gray-500 rounded-lg px-3 py-1 text-xs"
              >
                לא מטופל ✕
              </button>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">{entry.name}</span>
                <span className="bg-blue-900/50 border border-blue-600/50 text-blue-300 rounded px-2 py-0.5 text-xs">חדש</span>
              </div>
            </div>
            <input
              type="number"
              value={entry.rate}
              onChange={(e) => setRate(i, e.target.value)}
              placeholder="מחיר ברירת מחדל לפגישה (₪)"
              className="w-full bg-card border border-gray-700 rounded-lg px-3 py-2 text-white text-right text-sm placeholder-gray-600"
            />
          </div>
        )
      )}

      <button
        onClick={handleFinish}
        disabled={saving}
        className="w-full bg-blue-600 text-white rounded-xl py-4 font-medium mt-4 disabled:opacity-50"
      >
        {saving ? '...' : 'סיום וכניסה לאפליקציה ✓'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Create OnboardingFlow orchestrator**

Create `components/OnboardingFlow/index.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { StepConnect } from './StepConnect'
import { StepSync } from './StepSync'
import { StepLinkPatients } from './StepLinkPatients'

type Step = 'connect' | 'sync' | 'link'

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>('connect')
  const [unknownNames, setUnknownNames] = useState<string[]>([])

  if (step === 'connect') {
    return <StepConnect onNext={() => setStep('sync')} />
  }
  if (step === 'sync') {
    return (
      <StepSync
        onNext={(names) => {
          setUnknownNames(names)
          setStep('link')
        }}
      />
    )
  }
  return <StepLinkPatients unknownNames={unknownNames} />
}
```

- [ ] **Step 5: Create onboarding page**

Create `app/onboarding/page.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingFlow } from '@/components/OnboardingFlow'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { count } = await supabase
    .from('patients')
    .select('*', { count: 'exact', head: true })

  if ((count ?? 0) > 0) redirect('/sessions')

  return <OnboardingFlow />
}
```

- [ ] **Step 6: Run all tests**

```bash
npm test
```

Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add components/OnboardingFlow/ app/onboarding/
git commit -m "feat: add 3-step onboarding flow with calendar sync and patient linking"
```

---

## Task 16: Hebrew Date Locale

**Files:**
- Modify: `app/patients/[id]/PatientDetailClient.tsx`

The patient detail page uses `date-fns` to format session dates. Hebrew months need the `he` locale.

- [ ] **Step 1: Install Hebrew locale**

date-fns includes the `he` locale out of the box — no extra install needed.

- [ ] **Step 2: Apply Hebrew locale to date formatting**

In `app/patients/[id]/PatientDetailClient.tsx`, change the import at the top:

```typescript
import { format } from 'date-fns'
import { he } from 'date-fns/locale'
```

Change the format call in the session list from:

```typescript
{format(new Date(s.start_time), 'd בMMMM yyyy', { locale: undefined })}
```

to:

```typescript
{format(new Date(s.start_time), 'd בMMMM yyyy', { locale: he })}
```

- [ ] **Step 3: Commit**

```bash
git add app/patients/[id]/PatientDetailClient.tsx
git commit -m "fix: apply Hebrew locale to date formatting"
```

---

## Final Verification

- [ ] Run full test suite: `npm test` — all tests PASS
- [ ] Run dev server: `npm run dev` — app loads at http://localhost:3000
- [ ] Verify redirect to `/login` when not authenticated
- [ ] Sign in with Google — verify redirect to `/onboarding`
- [ ] Complete onboarding — verify sessions appear on home screen
- [ ] Tap a session — verify bottom sheet opens with pre-filled amount
- [ ] Record payment — verify badge turns green
- [ ] Navigate to Patients tab — verify search and filter work
- [ ] Tap a patient — verify detail page shows history and editable rate
