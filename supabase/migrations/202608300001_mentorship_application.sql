-- Aplicações da Mentoria Entre Potencial e Resultado.
-- Somente estrutura e políticas; não contém dados reais ou credenciais.

create table public.mentoria_entre_potencial_resultado_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  whatsapp text not null,
  email text not null,
  city_state text not null,
  birth_date date not null,
  discovery_source text not null check (discovery_source in ('instagram', 'aula_gratuita', 'indicacao', 'whatsapp', 'linkedin', 'outro')),
  discovery_source_other text,
  professional_situation text not null,
  motivation text not null,
  desired_result text not null,
  main_obstacle text not null,
  preferred_format text not null check (preferred_format in ('individual', 'grupo', 'orientacao')),
  previous_mentoring_experience text,
  expectations text not null,
  selection_reason text not null,
  additional_information text,
  financial_availability text not null check (financial_availability in ('sim', 'talvez', 'nao')),
  preferred_session_period text not null check (preferred_session_period in ('manha', 'tarde', 'noite')),
  schedule_notes text,
  commitment_level text not null check (commitment_level in ('0-3', '4-6', '7-8', '9-10')),
  terms_accepted boolean not null check (terms_accepted is true),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint mentoria_application_other_source_required check (
    discovery_source <> 'outro'
    or nullif(trim(discovery_source_other), '') is not null
  )
);

create index mentoria_application_submitted_at_idx
  on public.mentoria_entre_potencial_resultado_applications (submitted_at desc);

create index mentoria_application_source_idx
  on public.mentoria_entre_potencial_resultado_applications (discovery_source, submitted_at desc);

alter table public.mentoria_entre_potencial_resultado_applications enable row level security;

revoke all on table public.mentoria_entre_potencial_resultado_applications from anon;
revoke all on table public.mentoria_entre_potencial_resultado_applications from authenticated;

grant insert on table public.mentoria_entre_potencial_resultado_applications to anon;
grant select, insert on table public.mentoria_entre_potencial_resultado_applications to authenticated;

create policy mentoria_application_public_insert
  on public.mentoria_entre_potencial_resultado_applications
  for insert to anon, authenticated
  with check (terms_accepted is true);

create policy mentoria_application_staff_select
  on public.mentoria_entre_potencial_resultado_applications
  for select to authenticated
  using (public.is_admin_or_commercial());
