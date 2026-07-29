begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create schema if not exists agrofarm;
comment on schema agrofarm is 'Domínio isolado do jogo AgroFarm.';

create type agrofarm.game_mode as enum ('free', 'realistic');
create type agrofarm.ledger_kind as enum (
  'initial_grant', 'seed_purchase', 'crop_sale', 'headquarters_upgrade',
  'warehouse_upgrade', 'machine_purchase', 'machine_repair', 'operating_cost', 'admin_adjustment'
);

create table agrofarm.crop_catalog (
  id text primary key,
  name text not null,
  icon text not null,
  seed_cost numeric(14,2) not null check (seed_cost >= 0),
  growth_seconds integer not null check (growth_seconds > 0),
  base_yield integer not null check (base_yield > 0),
  sale_price numeric(14,2) not null check (sale_price >= 0),
  unlock_level integer not null default 1 check (unlock_level between 1 and 10),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table agrofarm.machine_catalog (
  id text primary key,
  name text not null,
  icon text not null,
  description text not null,
  purchase_cost numeric(14,2) not null check (purchase_cost >= 0),
  repair_base_cost numeric(14,2) not null check (repair_base_cost >= 0),
  unlock_level integer not null default 1 check (unlock_level between 1 and 10),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table agrofarm.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agrofarm.farms (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references agrofarm.profiles(id) on delete cascade,
  name text not null default 'Fazenda Vale Verde',
  mode agrofarm.game_mode not null default 'free',
  selected_crop_id text not null default 'corn' references agrofarm.crop_catalog(id),
  coins numeric(14,2) not null default 100 check (coins >= 0),
  farm_level integer not null default 1 check (farm_level between 1 and 10),
  warehouse_level integer not null default 1 check (warehouse_level between 1 and 5),
  warehouse_capacity integer not null default 10 check (warehouse_capacity > 0),
  care_score integer not null default 100 check (care_score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table agrofarm.farm_plots (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references agrofarm.farms(id) on delete cascade,
  position integer not null check (position >= 0),
  crop_id text references agrofarm.crop_catalog(id),
  planted_at timestamptz,
  ready_at timestamptz,
  watered boolean not null default false,
  protected boolean not null default false,
  health integer not null default 100 check (health between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, position),
  check ((crop_id is null and planted_at is null and ready_at is null) or (crop_id is not null and planted_at is not null and ready_at is not null))
);

create table agrofarm.inventory (
  farm_id uuid not null references agrofarm.farms(id) on delete cascade,
  item_id text not null references agrofarm.crop_catalog(id),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (farm_id, item_id)
);

create table agrofarm.farm_machines (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references agrofarm.farms(id) on delete cascade,
  machine_id text not null references agrofarm.machine_catalog(id),
  owned boolean not null default false,
  automation boolean not null default false,
  condition integer not null default 100 check (condition between 0 and 100),
  broken boolean not null default false,
  last_operated_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (farm_id, machine_id)
);

create table agrofarm.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references agrofarm.farms(id) on delete cascade,
  kind agrofarm.ledger_kind not null,
  amount numeric(14,2) not null,
  balance_after numeric(14,2) not null check (balance_after >= 0),
  reference_type text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table agrofarm.game_events (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references agrofarm.farms(id) on delete cascade,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'danger')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index farm_plots_ready_idx on agrofarm.farm_plots(farm_id, ready_at);
create index ledger_farm_created_idx on agrofarm.ledger_entries(farm_id, created_at desc);
create index events_farm_created_idx on agrofarm.game_events(farm_id, created_at desc);

insert into agrofarm.crop_catalog (id, name, icon, seed_cost, growth_seconds, base_yield, sale_price)
values
  ('corn', 'Milho', '🌽', 4, 20, 3, 3),
  ('cassava', 'Mandioca', '🌿', 8, 35, 5, 4),
  ('pineapple', 'Abacaxi', '🍍', 15, 60, 6, 6);

insert into agrofarm.machine_catalog (id, name, icon, description, purchase_cost, repair_base_cost, unlock_level)
values
  ('irrigator', 'Irrigador automático', '💧', 'Irriga plantações automaticamente.', 65, 18, 1),
  ('planter', 'Plantadeira', '🚜', 'Planta automaticamente a cultura selecionada.', 120, 35, 2),
  ('harvester', 'Colheitadeira', '⚙️', 'Colhe automaticamente quando houver espaço.', 240, 70, 3);

create or replace function agrofarm.farm_multiplier(p_level integer)
returns numeric language sql immutable strict as $$
  select least(2.8, 1 + (greatest(1, p_level) - 1) * 0.2)::numeric;
$$;

create or replace function agrofarm.owns_farm(p_farm_id uuid)
returns boolean language sql stable security definer
set search_path = agrofarm, auth, public as $$
  select exists (select 1 from agrofarm.farms where id = p_farm_id and owner_id = auth.uid());
$$;

create or replace function agrofarm.bootstrap_player(p_user_id uuid default auth.uid())
returns uuid language plpgsql security definer
set search_path = agrofarm, auth, public, extensions as $$
declare
  v_farm_id uuid;
  v_name text;
  v_avatar text;
begin
  if p_user_id is null then raise exception 'Usuário não autenticado'; end if;
  select coalesce(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', email), raw_user_meta_data->>'avatar_url'
    into v_name, v_avatar from auth.users where id = p_user_id;

  insert into agrofarm.profiles (id, display_name, avatar_url)
  values (p_user_id, v_name, v_avatar)
  on conflict (id) do update set display_name = excluded.display_name, avatar_url = excluded.avatar_url;

  insert into agrofarm.farms (owner_id) values (p_user_id)
  on conflict (owner_id) do nothing returning id into v_farm_id;

  if v_farm_id is null then
    select id into v_farm_id from agrofarm.farms where owner_id = p_user_id;
  else
    insert into agrofarm.farm_plots (farm_id, position)
    select v_farm_id, n from generate_series(0, 5) n;
    insert into agrofarm.inventory (farm_id, item_id)
    select v_farm_id, id from agrofarm.crop_catalog where active;
    insert into agrofarm.farm_machines (farm_id, machine_id)
    select v_farm_id, id from agrofarm.machine_catalog where active;
    insert into agrofarm.ledger_entries (farm_id, kind, amount, balance_after, metadata)
    values (v_farm_id, 'initial_grant', 100, 100, jsonb_build_object('reason', 'saldo inicial'));
    insert into agrofarm.game_events (farm_id, severity, message)
    values (v_farm_id, 'success', 'Fazenda criada com 100 moedas e galpão para 10 unidades.');
  end if;
  return v_farm_id;
end;
$$;

create or replace function agrofarm.handle_new_auth_user()
returns trigger language plpgsql security definer
set search_path = agrofarm, auth, public, extensions as $$
begin
  perform agrofarm.bootstrap_player(new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_agrofarm on auth.users;
create trigger on_auth_user_created_agrofarm after insert on auth.users
for each row execute function agrofarm.handle_new_auth_user();

create or replace function agrofarm.set_game_mode(p_mode text)
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
begin
  if p_mode not in ('free', 'realistic') then raise exception 'Modo inválido'; end if;
  update agrofarm.farms set mode = p_mode::agrofarm.game_mode where owner_id = auth.uid();
  if not found then raise exception 'Fazenda não encontrada'; end if;
  return jsonb_build_object('mode', p_mode);
end;
$$;

create or replace function agrofarm.set_selected_crop(p_crop_id text)
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
begin
  if not exists (select 1 from agrofarm.crop_catalog where id = p_crop_id and active) then raise exception 'Cultura inválida'; end if;
  update agrofarm.farms set selected_crop_id = p_crop_id where owner_id = auth.uid();
  if not found then raise exception 'Fazenda não encontrada'; end if;
  return jsonb_build_object('selected_crop_id', p_crop_id);
end;
$$;

create or replace function agrofarm.upgrade_headquarters()
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare
  v agrofarm.farms%rowtype;
  v_cost numeric(14,2);
  v_next integer;
begin
  select * into v from agrofarm.farms where owner_id = auth.uid() for update;
  if not found then raise exception 'Fazenda não encontrada'; end if;
  if v.farm_level >= 10 then raise exception 'Nível máximo atingido'; end if;
  v_next := v.farm_level + 1;
  v_cost := case v_next when 2 then 150 when 3 then 450 when 4 then 1200 when 5 then 3000 when 6 then 7500 when 7 then 18000 when 8 then 45000 when 9 then 110000 when 10 then 275000 end;
  if v.coins < v_cost then raise exception 'Saldo insuficiente'; end if;
  update agrofarm.farms set coins = coins - v_cost, farm_level = v_next where id = v.id returning * into v;
  insert into agrofarm.ledger_entries (farm_id, kind, amount, balance_after, metadata)
  values (v.id, 'headquarters_upgrade', -v_cost, v.coins, jsonb_build_object('level', v_next));
  return jsonb_build_object('farm_level', v_next, 'coins', v.coins, 'multiplier', agrofarm.farm_multiplier(v_next));
end;
$$;

create or replace function agrofarm.upgrade_warehouse()
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare
  v agrofarm.farms%rowtype;
  v_cost numeric(14,2);
  v_capacity integer;
  v_next integer;
begin
  select * into v from agrofarm.farms where owner_id = auth.uid() for update;
  if not found then raise exception 'Fazenda não encontrada'; end if;
  if v.warehouse_level >= 5 then raise exception 'Nível máximo atingido'; end if;
  v_next := v.warehouse_level + 1;
  v_cost := case v_next when 2 then 100 when 3 then 300 when 4 then 800 when 5 then 2000 end;
  v_capacity := case v_next when 2 then 20 when 3 then 35 when 4 then 55 when 5 then 80 end;
  if v.coins < v_cost then raise exception 'Saldo insuficiente'; end if;
  update agrofarm.farms set coins = coins - v_cost, warehouse_level = v_next, warehouse_capacity = v_capacity where id = v.id returning * into v;
  insert into agrofarm.ledger_entries (farm_id, kind, amount, balance_after, metadata)
  values (v.id, 'warehouse_upgrade', -v_cost, v.coins, jsonb_build_object('level', v_next, 'capacity', v_capacity));
  return jsonb_build_object('warehouse_level', v_next, 'warehouse_capacity', v_capacity, 'coins', v.coins);
end;
$$;

create or replace function agrofarm.plant_crop(p_plot_position integer, p_crop_id text)
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare
  v agrofarm.farms%rowtype;
  c agrofarm.crop_catalog%rowtype;
  p agrofarm.farm_plots%rowtype;
begin
  select * into v from agrofarm.farms where owner_id = auth.uid() for update;
  select * into c from agrofarm.crop_catalog where id = p_crop_id and active;
  if not found then raise exception 'Cultura inválida'; end if;
  if v.coins < c.seed_cost then raise exception 'Saldo insuficiente'; end if;
  select * into p from agrofarm.farm_plots where farm_id = v.id and position = p_plot_position for update;
  if not found or p.crop_id is not null then raise exception 'Terreno indisponível'; end if;
  update agrofarm.farm_plots set crop_id = c.id, planted_at = now(), ready_at = now() + make_interval(secs => c.growth_seconds), watered = false, protected = false, health = 100 where id = p.id;
  update agrofarm.farms set coins = coins - c.seed_cost where id = v.id returning * into v;
  insert into agrofarm.ledger_entries (farm_id, kind, amount, balance_after, reference_type, reference_id)
  values (v.id, 'seed_purchase', -c.seed_cost, v.coins, 'crop', c.id);
  return jsonb_build_object('position', p_plot_position, 'crop_id', c.id, 'coins', v.coins);
end;
$$;

create or replace function agrofarm.care_crop(p_plot_position integer, p_action text)
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare
  v agrofarm.farms%rowtype;
  p agrofarm.farm_plots%rowtype;
  v_cost numeric(14,2) := 0;
begin
  if p_action not in ('water', 'protect') then raise exception 'Ação inválida'; end if;
  select * into v from agrofarm.farms where owner_id = auth.uid() for update;
  select * into p from agrofarm.farm_plots where farm_id = v.id and position = p_plot_position for update;
  if p.crop_id is null then raise exception 'Terreno vazio'; end if;
  if p_action = 'protect' then v_cost := 2; end if;
  if v.coins < v_cost then raise exception 'Saldo insuficiente'; end if;
  update agrofarm.farm_plots set watered = case when p_action = 'water' then true else watered end, protected = case when p_action = 'protect' then true else protected end where id = p.id;
  if v_cost > 0 then
    update agrofarm.farms set coins = coins - v_cost where id = v.id returning * into v;
    insert into agrofarm.ledger_entries (farm_id, kind, amount, balance_after, metadata)
    values (v.id, 'operating_cost', -v_cost, v.coins, jsonb_build_object('action', p_action));
  end if;
  return jsonb_build_object('position', p_plot_position, 'action', p_action, 'coins', v.coins);
end;
$$;

create or replace function agrofarm.harvest_crop(p_plot_position integer)
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare
  v agrofarm.farms%rowtype;
  p agrofarm.farm_plots%rowtype;
  c agrofarm.crop_catalog%rowtype;
  v_factor numeric := 1;
  v_produced integer;
  v_used integer;
  v_stored integer;
begin
  select * into v from agrofarm.farms where owner_id = auth.uid() for update;
  select * into p from agrofarm.farm_plots where farm_id = v.id and position = p_plot_position for update;
  if p.crop_id is null then raise exception 'Terreno vazio'; end if;
  if p.ready_at > now() then raise exception 'Plantação ainda não está pronta'; end if;
  select * into c from agrofarm.crop_catalog where id = p.crop_id;
  if p.watered then v_factor := v_factor + 0.1; end if;
  if p.protected then v_factor := v_factor + 0.1; end if;
  if v.mode = 'realistic' then
    if not p.watered and random() < 0.4 then v_factor := v_factor - 0.5; end if;
    if not p.protected and random() < 0.45 then v_factor := v_factor - 0.55; end if;
    if not p.watered and not p.protected and random() < 0.2 then v_factor := 0; end if;
  else
    v_factor := greatest(1, v_factor);
  end if;
  v_produced := greatest(0, floor(c.base_yield * greatest(0, v_factor))::integer);
  select coalesce(sum(quantity), 0) into v_used from agrofarm.inventory where farm_id = v.id;
  v_stored := least(v_produced, greatest(0, v.warehouse_capacity - v_used));
  update agrofarm.inventory set quantity = quantity + v_stored where farm_id = v.id and item_id = c.id;
  update agrofarm.farm_plots set crop_id = null, planted_at = null, ready_at = null, watered = false, protected = false, health = 100 where id = p.id;
  insert into agrofarm.game_events (farm_id, severity, message, metadata)
  values (v.id, case when v_stored = 0 then 'danger' when v_stored < v_produced then 'warning' else 'success' end, case when v_produced = 0 then 'A produção foi perdida.' when v_stored < v_produced then 'Colheita parcial por falta de espaço.' else 'Colheita concluída.' end, jsonb_build_object('crop_id', c.id, 'produced', v_produced, 'stored', v_stored));
  return jsonb_build_object('crop_id', c.id, 'produced', v_produced, 'stored', v_stored, 'lost', v_produced - v_stored);
end;
$$;

create or replace function agrofarm.sell_crop(p_crop_id text)
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare
  v agrofarm.farms%rowtype;
  c agrofarm.crop_catalog%rowtype;
  v_quantity integer;
  v_revenue numeric(14,2);
begin
  select * into v from agrofarm.farms where owner_id = auth.uid() for update;
  select * into c from agrofarm.crop_catalog where id = p_crop_id and active;
  select quantity into v_quantity from agrofarm.inventory where farm_id = v.id and item_id = p_crop_id for update;
  if coalesce(v_quantity, 0) <= 0 then raise exception 'Sem estoque para vender'; end if;
  v_revenue := round((v_quantity * c.sale_price * agrofarm.farm_multiplier(v.farm_level))::numeric, 2);
  update agrofarm.inventory set quantity = 0 where farm_id = v.id and item_id = p_crop_id;
  update agrofarm.farms set coins = coins + v_revenue where id = v.id returning * into v;
  insert into agrofarm.ledger_entries (farm_id, kind, amount, balance_after, reference_type, reference_id, metadata)
  values (v.id, 'crop_sale', v_revenue, v.coins, 'crop', p_crop_id, jsonb_build_object('quantity', v_quantity));
  return jsonb_build_object('quantity', v_quantity, 'revenue', v_revenue, 'coins', v.coins);
end;
$$;

create or replace function agrofarm.buy_machine(p_machine_id text)
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare
  v agrofarm.farms%rowtype;
  m agrofarm.machine_catalog%rowtype;
begin
  select * into v from agrofarm.farms where owner_id = auth.uid() for update;
  select * into m from agrofarm.machine_catalog where id = p_machine_id and active;
  if not found then raise exception 'Máquina inválida'; end if;
  if v.farm_level < m.unlock_level then raise exception 'Máquina bloqueada'; end if;
  if v.coins < m.purchase_cost then raise exception 'Saldo insuficiente'; end if;
  update agrofarm.farm_machines set owned = true, condition = 100, broken = false, automation = false where farm_id = v.id and machine_id = p_machine_id and not owned;
  if not found then raise exception 'Máquina já adquirida'; end if;
  update agrofarm.farms set coins = coins - m.purchase_cost where id = v.id returning * into v;
  insert into agrofarm.ledger_entries (farm_id, kind, amount, balance_after, reference_type, reference_id)
  values (v.id, 'machine_purchase', -m.purchase_cost, v.coins, 'machine', p_machine_id);
  return jsonb_build_object('machine_id', p_machine_id, 'coins', v.coins);
end;
$$;

create or replace function agrofarm.repair_machine(p_machine_id text)
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare
  v agrofarm.farms%rowtype;
  fm agrofarm.farm_machines%rowtype;
  m agrofarm.machine_catalog%rowtype;
  v_cost numeric(14,2);
begin
  select * into v from agrofarm.farms where owner_id = auth.uid() for update;
  select * into fm from agrofarm.farm_machines where farm_id = v.id and machine_id = p_machine_id and owned for update;
  if not found then raise exception 'Máquina não adquirida'; end if;
  select * into m from agrofarm.machine_catalog where id = p_machine_id;
  v_cost := greatest(5, ceil(m.repair_base_cost * ((100 - fm.condition)::numeric / 50)));
  if v.coins < v_cost then raise exception 'Saldo insuficiente'; end if;
  update agrofarm.farm_machines set condition = 100, broken = false, automation = false where id = fm.id;
  update agrofarm.farms set coins = coins - v_cost where id = v.id returning * into v;
  insert into agrofarm.ledger_entries (farm_id, kind, amount, balance_after, reference_type, reference_id)
  values (v.id, 'machine_repair', -v_cost, v.coins, 'machine', p_machine_id);
  return jsonb_build_object('cost', v_cost, 'coins', v.coins, 'condition', 100);
end;
$$;

create or replace function agrofarm.set_machine_automation(p_machine_id text, p_enabled boolean)
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare v_farm_id uuid;
begin
  select id into v_farm_id from agrofarm.farms where owner_id = auth.uid();
  update agrofarm.farm_machines set automation = p_enabled where farm_id = v_farm_id and machine_id = p_machine_id and owned and not broken;
  if not found then raise exception 'Máquina indisponível ou com defeito'; end if;
  return jsonb_build_object('machine_id', p_machine_id, 'automation', p_enabled);
end;
$$;

create or replace function agrofarm.run_automation_cycle()
returns jsonb language plpgsql security definer
set search_path = agrofarm, auth, public as $$
declare
  v agrofarm.farms%rowtype;
  m agrofarm.farm_machines%rowtype;
  v_position integer;
  v_condition integer;
  v_chance numeric;
  v_actions integer := 0;
  v_failures integer := 0;
  v_used integer;
begin
  select * into v from agrofarm.farms where owner_id = auth.uid() for update;
  if not found then raise exception 'Fazenda não encontrada'; end if;
  for m in select * from agrofarm.farm_machines where farm_id = v.id and owned and automation and not broken order by machine_id for update loop
    v_position := null;
    if m.machine_id = 'irrigator' then
      select position into v_position from agrofarm.farm_plots where farm_id = v.id and crop_id is not null and not watered order by ready_at limit 1;
    elsif m.machine_id = 'planter' then
      select position into v_position from agrofarm.farm_plots where farm_id = v.id and crop_id is null and v.coins >= (select seed_cost from agrofarm.crop_catalog where id = v.selected_crop_id) order by position limit 1;
    elsif m.machine_id = 'harvester' then
      select coalesce(sum(quantity), 0) into v_used from agrofarm.inventory where farm_id = v.id;
      if v_used < v.warehouse_capacity then select position into v_position from agrofarm.farm_plots where farm_id = v.id and crop_id is not null and ready_at <= now() order by ready_at limit 1; end if;
    end if;
    if v_position is null then continue; end if;
    v_condition := greatest(0, m.condition - 1);
    v_chance := case when v_condition <= 20 then 0.35 when v_condition <= 40 then 0.15 when v_condition <= 60 then 0.06 when v_condition <= 80 then 0.025 else 0.008 end;
    if v_condition = 0 or random() < v_chance then
      update agrofarm.farm_machines set condition = v_condition, broken = true, automation = false, last_operated_at = now() where id = m.id;
      insert into agrofarm.game_events (farm_id, severity, message, metadata) values (v.id, 'danger', 'Uma máquina apresentou defeito e interrompeu a automação.', jsonb_build_object('machine_id', m.machine_id));
      v_failures := v_failures + 1;
      continue;
    end if;
    update agrofarm.farm_machines set condition = v_condition, last_operated_at = now() where id = m.id;
    if m.machine_id = 'irrigator' then perform agrofarm.care_crop(v_position, 'water'); end if;
    if m.machine_id = 'planter' then perform agrofarm.plant_crop(v_position, v.selected_crop_id); select * into v from agrofarm.farms where id = v.id; end if;
    if m.machine_id = 'harvester' then perform agrofarm.harvest_crop(v_position); end if;
    v_actions := v_actions + 1;
  end loop;
  return jsonb_build_object('actions', v_actions, 'failures', v_failures);
end;
$$;

alter table agrofarm.crop_catalog enable row level security;
alter table agrofarm.machine_catalog enable row level security;
alter table agrofarm.profiles enable row level security;
alter table agrofarm.farms enable row level security;
alter table agrofarm.farm_plots enable row level security;
alter table agrofarm.inventory enable row level security;
alter table agrofarm.farm_machines enable row level security;
alter table agrofarm.ledger_entries enable row level security;
alter table agrofarm.game_events enable row level security;

create policy crop_catalog_read on agrofarm.crop_catalog for select to anon, authenticated using (active);
create policy machine_catalog_read on agrofarm.machine_catalog for select to anon, authenticated using (active);
create policy profiles_read_own on agrofarm.profiles for select to authenticated using (id = auth.uid());
create policy farms_read_own on agrofarm.farms for select to authenticated using (owner_id = auth.uid());
create policy plots_read_own on agrofarm.farm_plots for select to authenticated using (agrofarm.owns_farm(farm_id));
create policy inventory_read_own on agrofarm.inventory for select to authenticated using (agrofarm.owns_farm(farm_id));
create policy machines_read_own on agrofarm.farm_machines for select to authenticated using (agrofarm.owns_farm(farm_id));
create policy ledger_read_own on agrofarm.ledger_entries for select to authenticated using (agrofarm.owns_farm(farm_id));
create policy events_read_own on agrofarm.game_events for select to authenticated using (agrofarm.owns_farm(farm_id));

grant usage on schema agrofarm to anon, authenticated, service_role;
grant select on agrofarm.crop_catalog, agrofarm.machine_catalog to anon, authenticated;
grant select on agrofarm.profiles, agrofarm.farms, agrofarm.farm_plots, agrofarm.inventory, agrofarm.farm_machines, agrofarm.ledger_entries, agrofarm.game_events to authenticated;
grant all on all tables in schema agrofarm to service_role;
grant usage, select on all sequences in schema agrofarm to service_role;

grant execute on function agrofarm.bootstrap_player(uuid) to authenticated;
grant execute on function agrofarm.set_game_mode(text) to authenticated;
grant execute on function agrofarm.set_selected_crop(text) to authenticated;
grant execute on function agrofarm.upgrade_headquarters() to authenticated;
grant execute on function agrofarm.upgrade_warehouse() to authenticated;
grant execute on function agrofarm.plant_crop(integer, text) to authenticated;
grant execute on function agrofarm.care_crop(integer, text) to authenticated;
grant execute on function agrofarm.harvest_crop(integer) to authenticated;
grant execute on function agrofarm.sell_crop(text) to authenticated;
grant execute on function agrofarm.buy_machine(text) to authenticated;
grant execute on function agrofarm.repair_machine(text) to authenticated;
grant execute on function agrofarm.set_machine_automation(text, boolean) to authenticated;
grant execute on function agrofarm.run_automation_cycle() to authenticated;

alter default privileges in schema agrofarm grant all on tables to service_role;
alter default privileges in schema agrofarm grant usage, select on sequences to service_role;

commit;
