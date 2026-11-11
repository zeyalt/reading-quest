-- Points, rewards, family goal & parent settings (2026-11-11)
--
-- Run once in the Supabase SQL editor. Additive only — no existing data is
-- modified.
--
--  users.main_language / second_language — decide book-finish point values.
--  family_settings     — single row (id = 1) of parent-controlled config,
--                        including the hashed parent PIN.
--  rewards             — the reward shop, managed in-app by the parent.
--  points_transactions — append-only ledger of earning (+) and spending (-).
--                        A reader's balance is the sum of their rows.
--                        Automatic awards carry a ref_key (e.g.
--                        'streak:2026-11-11', 'book:<uuid>'); the unique
--                        (user_id, ref_key) constraint guarantees nothing is
--                        ever paid twice. Redemptions/adjustments use NULL.
--
-- RLS: enabled with no policies, mirroring the existing tables (the app writes
-- via the service_role key).

-- ------------------------------------------------------------------ users
alter table public.users add column if not exists main_language   text;
alter table public.users add column if not exists second_language text;

-- -------------------------------------------------------- family_settings
create table if not exists public.family_settings (
  id                      int2        primary key default 1 check (id = 1),
  pin_hash                text,
  streak_cap              int4        check (streak_cap is null or streak_cap > 0),
  streak_requires_target  boolean     not null default false,
  book_points_main        int4        not null default 20 check (book_points_main >= 0),
  book_points_second      int4        not null default 40 check (book_points_second >= 0),
  family_goal_pages       int4        not null default 1500 check (family_goal_pages > 0),
  family_goal_reward      text,
  -- Automatic awards only count from this date. Streaks that began earlier
  -- still carry their length over (day 11 of an existing streak earns 11).
  points_start_date       date        not null default '2026-11-11',
  updated_at              timestamptz not null default now()
);

insert into public.family_settings (id) values (1) on conflict (id) do nothing;

alter table public.family_settings enable row level security;

-- ---------------------------------------------------------------- rewards
create table if not exists public.rewards (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  emoji       text        not null default '🎁',
  cost        int4        not null check (cost > 0),
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now()
);

alter table public.rewards enable row level security;

-- Starter rewards (edit or hide them in Settings → Parent area).
insert into public.rewards (name, emoji, cost)
select * from (values
  ('Pick Friday dinner',      '🍕', 50),
  ('Stay up 20 minutes later', '🌙', 80),
  ('Ice cream treat',          '🍦', 100),
  ('Bookshop trip',            '📚', 200)
) as v(name, emoji, cost)
where not exists (select 1 from public.rewards);

-- ---------------------------------------------------- points_transactions
create table if not exists public.points_transactions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.users (id) on delete cascade,
  amount       int4        not null check (amount <> 0),
  kind         text        not null check (kind in ('streak', 'book', 'redeem', 'adjust')),
  description  text        not null,
  ref_key      text,
  created_at   timestamptz not null default now(),
  unique (user_id, ref_key)
);

create index if not exists points_transactions_user_idx
  on public.points_transactions (user_id, created_at desc);

alter table public.points_transactions enable row level security;
