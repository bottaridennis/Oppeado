-- 1. Tabella Tag
create table tags (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  label text not null,
  icon text not null,
  color_class text not null default 'badge-special' check (color_class in ('badge-limit', 'badge-special')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabella Eventi
create table events (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  titolo text not null,
  tag text not null references tags(name) on update cascade,
  tag_label text, -- rimosso in futuro? per ora manteniamolo per compatibilità
  time_start text default '21:00',
  time_end text default '22:00',
  luogo text not null,
  testo text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Abilita RLS
alter table tags enable row level security;
alter table events enable row level security;

-- 4. Policy Tag: Lettura pubblica, scrittura solo admin
create policy "Chiunque può vedere i tag" on tags for select using (true);
create policy "Solo admin può modificare i tag" on tags for all using (auth.role() = 'authenticated');

-- 5. Policy Eventi
create policy "Chiunque può vedere gli eventi" on events for select using (true);
create policy "Solo admin può modificare eventi" on events for all using (auth.role() = 'authenticated');

-- 6. Inserimento tag iniziali
insert into tags (name, label, icon, color_class) values
  ('limit', 'Tema limite', 'bx bx-brain', 'badge-limit'),
  ('special', 'Movie & Games', 'bx bx-film', 'badge-special'),
  ('gita', 'Gita / Uscita', 'bx bx-bus', 'badge-special'),
  ('evento', 'Evento speciale', 'bx bx-star', 'badge-special'),
  ('messa', 'Messa dei giovani', 'bx bxs-church', 'badge-limit'),
  ('coro', 'Prove coro', 'bx bx-music', 'badge-limit'),
  ('sport', 'Torneo / Sport', 'bx bx-football', 'badge-special'),
  ('pizza', 'Cena insieme', 'bx bx-dish', 'badge-special')
on conflict (name) do nothing;

-- Nota: per aggiungere un admin, devi registrarti su Supabase Auth e fare il login
-- Se vuoi restringere a una mail specifica:
-- create policy "Solo Dennis può modificare eventi"
--   on events for all
--   using ( auth.email() = 'tua-email@esempio.com' );
