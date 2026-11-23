-- =====================================================================
-- RadioPatio Trip - esquema inicial
-- Ejecutar en Supabase: SQL Editor -> pegar -> Run  (o `supabase db push`)
--
-- Principios GDPR aplicados aquí:
--  * Minimización: solo guardamos nombre visible y foto de perfil. El email
--    vive únicamente en auth.users (gestionado por Supabase) y nunca se copia.
--  * Acceso restringido: RLS en todas las tablas. Solo los miembros de un
--    viaje ven los datos de ese viaje. Los perfiles solo son visibles para
--    personas con las que compartes viaje.
--  * Buckets privados: fotos, vídeos, billetes y avatares se sirven con URLs
--    firmadas de corta duración, nunca públicas.
--  * Consentimiento registrado: versión y fecha de aceptación de la política.
--  * Derecho de acceso y portabilidad: export_my_data() devuelve todo en JSON.
--  * Derecho de supresión: delete_my_account() borra usuario, perfil,
--    archivos subidos y pertenencias; los viajes sin miembros se eliminan.
--  * No guardamos geolocalización de las personas: la ubicación del móvil
--    solo se usa en el cliente para abrir Google Maps.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.transport_kind as enum ('flight','train','bus','ferry','car','taxi','metro','tram','walk','other');
create type public.visit_category as enum ('monument','museum','tour','nature','show','food','shopping','nightlife','free','other');
create type public.dish_category as enum ('starter','main','dessert','drink','snack','breakfast');
create type public.media_kind as enum ('image','video','document');
create type public.member_role as enum ('owner','member');

-- ---------------------------------------------------------------------
-- Perfiles (datos personales mínimos)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  avatar_path text,
  consent_version text not null default '1.0',
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Crea el perfil automáticamente al registrarse (nombre tomado de metadata)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, consent_version, consent_at)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'consent_version','1.0'),
    now()
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------
-- Viajes y miembros
-- ---------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  destination text not null,
  country text,
  lat double precision,
  lng double precision,
  start_date date not null,
  end_date date not null check (end_date >= start_date),
  description text,
  cover_path text,
  currency text not null default 'GBP',
  home_currency text not null default 'EUR',
  timezone text not null default 'Europe/London',
  invite_code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,8)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  -- FK a profiles (y no a auth.users) para poder embeber el perfil desde la app
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);
create index on public.trip_members (user_id);

-- Helper: ¿es el usuario actual miembro del viaje? (security definer evita
-- recursión de RLS sobre trip_members)
create or replace function public.is_trip_member(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = auth.uid());
$$;

create or replace function public.is_trip_owner(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members where trip_id = t and user_id = auth.uid() and role = 'owner');
$$;

-- El creador pasa a ser owner automáticamente
create or replace function public.handle_new_trip()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_members (trip_id, user_id, role) values (new.id, auth.uid(), 'owner');
  return new;
end $$;
create trigger on_trip_created after insert on public.trips
  for each row execute procedure public.handle_new_trip();

-- Unirse con código de invitación
create or replace function public.join_trip_by_code(code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare t_id uuid;
begin
  select id into t_id from public.trips where invite_code = upper(trim(code));
  if t_id is null then raise exception 'Código de invitación no válido'; end if;
  insert into public.trip_members (trip_id, user_id) values (t_id, auth.uid())
    on conflict do nothing;
  return t_id;
end $$;

-- ---------------------------------------------------------------------
-- Transportes
-- ---------------------------------------------------------------------
create table public.transports (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  kind public.transport_kind not null default 'flight',
  carrier text,
  code text,                     -- nº de vuelo / tren
  from_name text not null,
  from_lat double precision,
  from_lng double precision,
  to_name text not null,
  to_lat double precision,
  to_lng double precision,
  depart_at timestamptz not null,
  arrive_at timestamptz,
  booking_ref text,
  seats text,
  price numeric(10,2),
  currency text default 'EUR',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.transports (trip_id, depart_at);

-- ---------------------------------------------------------------------
-- Visitas / actividades
-- ---------------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  category public.visit_category not null default 'monument',
  place_name text,
  address text,
  lat double precision,
  lng double precision,
  start_at timestamptz not null,
  end_at timestamptz,
  ticket_ref text,
  price numeric(10,2),
  currency text default 'GBP',
  url text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.visits (trip_id, start_at);

-- ---------------------------------------------------------------------
-- Gastronomía ("carta")
-- ---------------------------------------------------------------------
create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  category public.dish_category not null default 'main',
  description text,
  typical_price numeric(10,2),
  currency text default 'GBP',
  where_to_try text,
  lat double precision,
  lng double precision,
  photo_path text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.dishes (trip_id);

create table public.dish_ratings (
  dish_id uuid not null references public.dishes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  tried_at timestamptz not null default now(),
  primary key (dish_id, user_id)
);

-- ---------------------------------------------------------------------
-- Multimedia y documentos (fotos, vídeos, billetes)
-- ---------------------------------------------------------------------
create table public.media (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  uploader_id uuid references auth.users(id) on delete set null,
  storage_path text not null unique,
  kind public.media_kind not null default 'image',
  mime text,
  filename text,
  size_bytes bigint,
  caption text,
  taken_at timestamptz not null default now(),
  ref_type text check (ref_type in ('transport','visit','dish')),
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index on public.media (trip_id, taken_at desc);
create index on public.media (ref_type, ref_id);

-- ---------------------------------------------------------------------
-- Gastos compartidos
-- ---------------------------------------------------------------------
create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  payer_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  amount numeric(10,2) not null check (amount > 0),
  currency text not null default 'GBP',
  split_with uuid[] not null default '{}',   -- vacío = todos los miembros
  spent_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.expenses (trip_id, spent_at desc);

-- ---------------------------------------------------------------------
-- Lista de maleta / tareas
-- ---------------------------------------------------------------------
create table public.checklist_items (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  text text not null,
  done boolean not null default false,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.checklist_items (trip_id);

-- ---------------------------------------------------------------------
-- Diario del viaje (una entrada por persona y día)
-- ---------------------------------------------------------------------
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  content text not null,
  mood text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (trip_id, author_id, day)
);

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.transports enable row level security;
alter table public.visits enable row level security;
alter table public.dishes enable row level security;
alter table public.dish_ratings enable row level security;
alter table public.media enable row level security;
alter table public.expenses enable row level security;
alter table public.checklist_items enable row level security;
alter table public.journal_entries enable row level security;

-- profiles: el mío, y los de quienes comparten viaje conmigo
create policy "profiles: read own or co-travellers" on public.profiles for select
  to authenticated using (
    id = auth.uid() or exists (
      select 1 from public.trip_members a
      join public.trip_members b on a.trip_id = b.trip_id
      where a.user_id = auth.uid() and b.user_id = profiles.id
    )
  );
create policy "profiles: update own" on public.profiles for update
  to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- trips
create policy "trips: members read" on public.trips for select
  to authenticated using (public.is_trip_member(id));
create policy "trips: anyone creates" on public.trips for insert
  to authenticated with check (auth.uid() is not null);
create policy "trips: members update" on public.trips for update
  to authenticated using (public.is_trip_member(id));
create policy "trips: owner deletes" on public.trips for delete
  to authenticated using (public.is_trip_owner(id));

-- trip_members
create policy "members: members read" on public.trip_members for select
  to authenticated using (public.is_trip_member(trip_id));
create policy "members: leave or owner removes" on public.trip_members for delete
  to authenticated using (user_id = auth.uid() or public.is_trip_owner(trip_id));

-- Macro para tablas "de viaje": miembros pueden todo
do $$
declare t text;
begin
  foreach t in array array['transports','visits','dishes','media','expenses','checklist_items']
  loop
    execute format('create policy "%1$s: members select" on public.%1$s for select to authenticated using (public.is_trip_member(trip_id))', t);
    execute format('create policy "%1$s: members insert" on public.%1$s for insert to authenticated with check (public.is_trip_member(trip_id))', t);
    execute format('create policy "%1$s: members update" on public.%1$s for update to authenticated using (public.is_trip_member(trip_id))', t);
    execute format('create policy "%1$s: members delete" on public.%1$s for delete to authenticated using (public.is_trip_member(trip_id))', t);
  end loop;
end $$;

-- dish_ratings: leer las del viaje, escribir solo las mías
create policy "ratings: members read" on public.dish_ratings for select
  to authenticated using (exists (select 1 from public.dishes d where d.id = dish_id and public.is_trip_member(d.trip_id)));
create policy "ratings: own insert" on public.dish_ratings for insert
  to authenticated with check (user_id = auth.uid() and exists (select 1 from public.dishes d where d.id = dish_id and public.is_trip_member(d.trip_id)));
create policy "ratings: own update" on public.dish_ratings for update
  to authenticated using (user_id = auth.uid());
create policy "ratings: own delete" on public.dish_ratings for delete
  to authenticated using (user_id = auth.uid());

-- journal: leer las del viaje, escribir solo las mías
create policy "journal: members read" on public.journal_entries for select
  to authenticated using (public.is_trip_member(trip_id));
create policy "journal: own insert" on public.journal_entries for insert
  to authenticated with check (author_id = auth.uid() and public.is_trip_member(trip_id));
create policy "journal: own update" on public.journal_entries for update
  to authenticated using (author_id = auth.uid());
create policy "journal: own delete" on public.journal_entries for delete
  to authenticated using (author_id = auth.uid());

-- ---------------------------------------------------------------------
-- Storage: buckets PRIVADOS
--   media/<trip_id>/<uuid>.<ext>      fotos, vídeos y documentos del viaje
--   avatars/<user_id>/avatar.jpg      foto de perfil
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', false, 52428800, array['image/jpeg','image/png','image/webp','image/heic','video/mp4','video/quicktime','video/webm','application/pdf']),
  ('avatars', 'avatars', false, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "media: members read" on storage.objects for select to authenticated
  using (bucket_id = 'media' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
create policy "media: members write" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
create policy "media: members delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_trip_member(((storage.foldername(name))[1])::uuid));

create policy "avatars: co-travellers read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (
    (storage.foldername(name))[1] = auth.uid()::text or exists (
      select 1 from public.trip_members a join public.trip_members b on a.trip_id = b.trip_id
      where a.user_id = auth.uid() and b.user_id::text = (storage.foldername(name))[1])
  ));
create policy "avatars: own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- GDPR: derecho de acceso / portabilidad
-- ---------------------------------------------------------------------
create or replace function public.export_my_data()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
    'email', (select email from auth.users where id = auth.uid()),
    'memberships', (select coalesce(jsonb_agg(to_jsonb(m)), '[]') from public.trip_members m where m.user_id = auth.uid()),
    'trips', (select coalesce(jsonb_agg(to_jsonb(t)), '[]') from public.trips t where public.is_trip_member(t.id)),
    'transports_created', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.transports x where x.created_by = auth.uid()),
    'visits_created', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.visits x where x.created_by = auth.uid()),
    'dishes_created', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.dishes x where x.created_by = auth.uid()),
    'dish_ratings', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.dish_ratings x where x.user_id = auth.uid()),
    'media_uploaded', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.media x where x.uploader_id = auth.uid()),
    'expenses_paid', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.expenses x where x.payer_id = auth.uid()),
    'journal_entries', (select coalesce(jsonb_agg(to_jsonb(x)), '[]') from public.journal_entries x where x.author_id = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------
-- GDPR: derecho de supresión. Borra la cuenta y todo lo que es personal.
-- Los contenidos compartidos (visitas, transportes...) creados por el
-- usuario se conservan anonimizados (created_by -> null) si el viaje sigue
-- teniendo miembros; lo que subió él (fotos, vídeos, docs) se elimina.
-- ---------------------------------------------------------------------
create or replace function public.delete_my_account()
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'No autenticado'; end if;

  -- Archivos del usuario
  delete from storage.objects where bucket_id = 'avatars' and (storage.foldername(name))[1] = uid::text;
  delete from storage.objects where bucket_id = 'media'
    and name in (select storage_path from public.media where uploader_id = uid);
  delete from public.media where uploader_id = uid;

  -- Datos propios
  delete from public.journal_entries where author_id = uid;
  delete from public.dish_ratings where user_id = uid;
  delete from public.expenses where payer_id = uid;
  update public.checklist_items set assigned_to = null where assigned_to = uid;
  update public.expenses set split_with = array_remove(split_with, uid) where uid = any(split_with);

  -- Viajes donde era el único miembro -> se eliminan por completo (con sus archivos)
  delete from storage.objects where bucket_id = 'media' and ((storage.foldername(name))[1])::uuid in (
    select t.id from public.trips t
    where not exists (select 1 from public.trip_members m where m.trip_id = t.id and m.user_id <> uid)
  );
  delete from public.trips t
    where not exists (select 1 from public.trip_members m where m.trip_id = t.id and m.user_id <> uid);

  -- Si era owner, cede la propiedad al miembro más antiguo
  update public.trip_members tm set role = 'owner'
  from (
    select distinct on (trip_id) trip_id, user_id from public.trip_members
    where user_id <> uid and trip_id in (select trip_id from public.trip_members where user_id = uid and role = 'owner')
    order by trip_id, joined_at
  ) nxt
  where tm.trip_id = nxt.trip_id and tm.user_id = nxt.user_id;

  delete from public.trip_members where user_id = uid;
  delete from public.profiles where id = uid;
  delete from auth.users where id = uid;
end $$;

-- ---------------------------------------------------------------------
-- Realtime (el timeline se actualiza en vivo para todos los miembros)
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.transports, public.visits, public.dishes, public.dish_ratings,
  public.media, public.expenses, public.checklist_items, public.journal_entries, public.trip_members;
