alter table public.templates
  add column if not exists deleted_at timestamptz;

create index if not exists templates_deleted_at_idx on public.templates(deleted_at);
