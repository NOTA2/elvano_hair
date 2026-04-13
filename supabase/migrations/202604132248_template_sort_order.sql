alter table public.templates
  add column if not exists sort_order integer not null default 0;

create index if not exists templates_sort_order_idx
  on public.templates(sort_order asc, name asc);
