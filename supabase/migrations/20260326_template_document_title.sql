alter table public.templates
  add column if not exists document_title text;

update public.templates
set document_title = name
where document_title is null;

alter table public.templates
  alter column document_title set not null;
