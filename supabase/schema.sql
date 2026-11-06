-- =========================================================
-- 수업 관찰 기록 앱 : Supabase 스키마
-- Supabase 대시보드 > SQL Editor 에 전체를 붙여넣고 Run 하세요.
-- 여러 번 실행해도 안전하도록 작성했습니다.
-- =========================================================

-- 1. 교사 프로필 ------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  created_at   timestamptz not null default now()
);

-- 2. 학급 ------------------------------------------------------
create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,                 -- 예: 2학년 3반
  subject    text not null default '',      -- 예: 정보
  year       int  not null default extract(year from now())::int,
  semester   int  not null default 1 check (semester in (1, 2)),
  created_at timestamptz not null default now()
);
create index if not exists classes_teacher_idx on public.classes (teacher_id);

-- 3. 학생 (실명 대신 번호/가명 사용 권장) -------------------------
create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id   uuid not null references public.classes (id) on delete cascade,
  number     int  not null,                 -- 출석 번호
  alias      text not null default '',      -- 가명 또는 이니셜
  note       text not null default '',
  created_at timestamptz not null default now(),
  unique (class_id, number)
);
create index if not exists students_class_idx on public.students (class_id);

-- 4. 관찰 태그 (교사별) -----------------------------------------
create table if not exists public.tags (
  id         uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  color      text not null default '#64748b',
  sort_order int  not null default 0,
  created_at timestamptz not null default now(),
  unique (teacher_id, name)
);

-- 5. 관찰 기록 --------------------------------------------------
create table if not exists public.observations (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null default auth.uid() references auth.users (id) on delete cascade,
  class_id    uuid not null references public.classes (id) on delete cascade,
  student_id  uuid not null references public.students (id) on delete cascade,
  observed_on date not null default current_date,
  content     text not null default '',
  tags        text[] not null default '{}',  -- 태그 이름 배열 (통계용)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists obs_student_idx on public.observations (student_id, observed_on desc);
create index if not exists obs_class_idx   on public.observations (class_id, observed_on desc);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists obs_touch on public.observations;
create trigger obs_touch before update on public.observations
  for each row execute function public.touch_updated_at();

-- =========================================================
-- 행 단위 보안 (RLS): 교사는 자기 데이터만 보고 쓸 수 있습니다.
-- =========================================================
alter table public.profiles     enable row level security;
alter table public.classes      enable row level security;
alter table public.students     enable row level security;
alter table public.tags         enable row level security;
alter table public.observations enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "own classes" on public.classes;
create policy "own classes" on public.classes
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

drop policy if exists "own tags" on public.tags;
create policy "own tags" on public.tags
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- 학생/기록은 "내 학급"에만 추가할 수 있도록 학급 소유도 확인
drop policy if exists "own students" on public.students;
create policy "own students" on public.students
  for all using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.classes c
                where c.id = students.class_id and c.teacher_id = auth.uid())
  );

drop policy if exists "own observations" on public.observations;
create policy "own observations" on public.observations
  for all using (teacher_id = auth.uid())
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.students s
                where s.id = observations.student_id
                  and s.class_id = observations.class_id
                  and s.teacher_id = auth.uid())
  );

-- =========================================================
-- 회원가입 시 프로필과 기본 태그를 자동으로 만들어 줍니다.
-- =========================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;

  insert into public.tags (teacher_id, name, color, sort_order) values
    (new.id, '문제해결', '#2563eb', 1),
    (new.id, '협업',     '#16a34a', 2),
    (new.id, '발표',     '#d97706', 3),
    (new.id, '질문',     '#7c3aed', 4),
    (new.id, '창의성',   '#db2777', 5),
    (new.id, '성실',     '#0891b2', 6),
    (new.id, '성장',     '#65a30d', 7),
    (new.id, '도움필요', '#dc2626', 8)
  on conflict (teacher_id, name) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
