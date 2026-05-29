-- ============================================================
--  Smart School Bus Management System — Supabase Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── Schools ──────────────────────────────────────────────────
create table schools (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  address     text,
  city        text default 'Kolkata',
  created_at  timestamptz default now()
);

-- ── Drivers ──────────────────────────────────────────────────
create table drivers (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  phone         text,
  license_no    text,
  safety_score  numeric(4,1) default 100.0,
  status        text default 'off_duty',  -- on_duty | off_duty
  school_id     uuid references schools(id),
  created_at    timestamptz default now()
);

-- ── Buses ────────────────────────────────────────────────────
create table buses (
  id            uuid primary key default uuid_generate_v4(),
  number        text not null unique,
  capacity      int default 40,
  status        text default 'idle',   -- idle | on_route | maintenance
  current_lat   numeric(10,7),
  current_lng   numeric(10,7),
  current_speed numeric(5,1) default 0,
  fuel_level    numeric(5,1) default 100,
  engine_health numeric(5,1) default 100,
  driver_id     uuid references drivers(id),
  school_id     uuid references schools(id),
  created_at    timestamptz default now()
);

-- ── Routes ───────────────────────────────────────────────────
create table routes (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  school_id   uuid references schools(id),
  waypoints   jsonb,   -- array of {lat, lng, stop_name}
  distance_km numeric(6,2),
  est_minutes int,
  created_at  timestamptz default now()
);

-- ── Parents ──────────────────────────────────────────────────
create table parents (
  id         uuid primary key default uuid_generate_v4(),
  name       text not null,
  phone      text,
  email      text,
  fcm_token  text,
  school_id  uuid references schools(id),
  created_at timestamptz default now()
);

-- ── Students ─────────────────────────────────────────────────
create table students (
  id             uuid primary key default uuid_generate_v4(),
  name           text not null,
  roll_no        text,
  class          text,
  pickup_lat     numeric(10,7),
  pickup_lng     numeric(10,7),
  pickup_address text,
  parent_id      uuid references parents(id),
  bus_id         uuid references buses(id),
  route_id       uuid references routes(id),
  school_id      uuid references schools(id),
  created_at     timestamptz default now()
);

-- ── Trips ────────────────────────────────────────────────────
create table trips (
  id           uuid primary key default uuid_generate_v4(),
  bus_id       uuid references buses(id),
  route_id     uuid references routes(id),
  driver_id    uuid references drivers(id),
  started_at   timestamptz,
  ended_at     timestamptz,
  status       text default 'scheduled',  -- scheduled | active | completed
  created_at   timestamptz default now()
);

-- ── Attendance ───────────────────────────────────────────────
create table attendance (
  id           uuid primary key default uuid_generate_v4(),
  trip_id      uuid references trips(id),
  student_id   uuid references students(id),
  boarded_at   timestamptz,
  dropped_at   timestamptz,
  status       text default 'absent',  -- boarded | dropped | absent
  created_at   timestamptz default now()
);

-- ── Alerts ───────────────────────────────────────────────────
create table alerts (
  id           uuid primary key default uuid_generate_v4(),
  bus_id       uuid references buses(id),
  trip_id      uuid references trips(id),
  type         text not null,  -- sos | overspeed | geofence | breakdown | medical | route_deviation
  message      text,
  lat          numeric(10,7),
  lng          numeric(10,7),
  resolved     boolean default false,
  created_at   timestamptz default now()
);

-- ── Notifications ────────────────────────────────────────────
create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  parent_id   uuid references parents(id),
  student_id  uuid references students(id),
  title       text,
  body        text,
  type        text,  -- boarding | dropping | sos | eta | general
  read        boolean default false,
  created_at  timestamptz default now()
);

-- ── Driver behavior logs ──────────────────────────────────────
create table driver_behavior (
  id           uuid primary key default uuid_generate_v4(),
  driver_id    uuid references drivers(id),
  trip_id      uuid references trips(id),
  event_type   text,  -- overspeed | harsh_brake | sharp_turn | fatigue
  speed        numeric(5,1),
  lat          numeric(10,7),
  lng          numeric(10,7),
  created_at   timestamptz default now()
);

-- ── GPS history ──────────────────────────────────────────────
create table gps_history (
  id         uuid primary key default uuid_generate_v4(),
  bus_id     uuid references buses(id),
  trip_id    uuid references trips(id),
  lat        numeric(10,7),
  lng        numeric(10,7),
  speed      numeric(5,1),
  recorded_at timestamptz default now()
);

-- ── Realtime: enable row-level security & policies ───────────
alter table buses          enable row level security;
alter table alerts         enable row level security;
alter table attendance     enable row level security;
alter table notifications  enable row level security;
alter table gps_history    enable row level security;

-- Public read for demo (tighten in production)
create policy "public read buses"         on buses         for select using (true);
create policy "public read alerts"        on alerts        for select using (true);
create policy "public read attendance"    on attendance    for select using (true);
create policy "public read notifications" on notifications for select using (true);
create policy "public read gps_history"   on gps_history   for select using (true);

-- ── Seed: demo school ────────────────────────────────────────
insert into schools (id, name, address, city) values
  ('00000000-0000-0000-0000-000000000001', 'St. Xavier''s School', 'Park Street, Kolkata', 'Kolkata');

insert into drivers (id, name, phone, license_no, safety_score, status, school_id) values
  ('00000000-0000-0000-0000-000000000010', 'Ramesh Mondal',   '9800000001', 'WB-0120240001', 94.5, 'on_duty',  '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000011', 'Suresh Biswas',   '9800000002', 'WB-0120240002', 87.2, 'on_duty',  '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000012', 'Tapas Chatterjee','9800000003', 'WB-0120240003', 78.0, 'off_duty', '00000000-0000-0000-0000-000000000001');

insert into buses (id, number, capacity, status, current_lat, current_lng, driver_id, school_id) values
  ('00000000-0000-0000-0000-000000000020', 'WB-06-A-1234', 40, 'on_route',   22.5726, 88.3639, '00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000021', 'WB-06-B-5678', 35, 'on_route',   22.5800, 88.3700, '00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000022', 'WB-06-C-9999', 45, 'idle',       22.5650, 88.3580, '00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001');

insert into parents (id, name, phone, email, school_id) values
  ('00000000-0000-0000-0000-000000000030', 'Ananya Roy',    '9700000001', 'ananya@demo.com', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000031', 'Bikash Ghosh',  '9700000002', 'bikash@demo.com', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000032', 'Chandana Das',  '9700000003', 'chandana@demo.com','00000000-0000-0000-0000-000000000001');

insert into students (id, name, roll_no, class, pickup_address, parent_id, bus_id, school_id) values
  ('00000000-0000-0000-0000-000000000040', 'Riya Roy',     'R001', 'Class 5', 'Salt Lake, Kolkata', '00000000-0000-0000-0000-000000000030', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000041', 'Arjun Ghosh',  'R002', 'Class 7', 'New Town, Kolkata',  '00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000042', 'Priya Das',    'R003', 'Class 6', 'Howrah, Kolkata',    '00000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-000000000001');
