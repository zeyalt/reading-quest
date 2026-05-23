-- Reading Plan + materialized schedule (2026-05-23)
--
-- Adds two new tables backing the Reading Plan feature:
--
--  reading_plan        — recurring weekly template per user
--                        (day_of_week -> language preference + target pages).
--                        7 rows max per user (one per day), but rows are
--                        created lazily as the user picks values.
--
--  scheduled_reading   — materialized per-date assignments generated from
--                        the plan. Each row pins one book to one calendar
--                        date for one user.
--
-- The existing `schedule` table is left untouched and can be dropped
-- later once the new flow is verified.
--
-- RLS: enabled with no policies, mirroring the existing tables. The app
-- writes via the service_role key (createServiceClient), which bypasses
-- RLS in Supabase by design.

-- ---------------------------------------------------------------- reading_plan
create table if not exists public.reading_plan (
  user_id        uuid        not null references public.users (id) on delete cascade,
  day_of_week    int2        not null check (day_of_week between 0 and 6),
  language       text,
  target_pages   int4        not null default 15 check (target_pages > 0),
  updated_at     timestamptz not null default now(),
  primary key (user_id, day_of_week)
);

alter table public.reading_plan enable row level security;


-- ----------------------------------------------------------- scheduled_reading
create table if not exists public.scheduled_reading (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references public.users (id) on delete cascade,
  date           date        not null,
  book_id        uuid        references public.books (id) on delete set null,
  target_pages   int4        not null default 15 check (target_pages > 0),
  created_at     timestamptz not null default now(),
  unique (user_id, date)
);

-- Fast lookups for /api/scheduled-reading?user_id=…&from=…&to=…
create index if not exists scheduled_reading_user_date_idx
  on public.scheduled_reading (user_id, date);

alter table public.scheduled_reading enable row level security;
