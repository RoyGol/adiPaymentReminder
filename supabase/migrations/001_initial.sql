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
