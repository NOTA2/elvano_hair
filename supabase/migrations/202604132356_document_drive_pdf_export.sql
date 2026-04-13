alter table public.documents
  add column if not exists drive_pdf_file_id text,
  add column if not exists drive_pdf_url text,
  add column if not exists pdf_export_status text,
  add column if not exists pdf_export_error text,
  add column if not exists pdf_exported_at timestamptz,
  add column if not exists pdf_export_updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_pdf_export_status_check'
  ) then
    alter table public.documents
      add constraint documents_pdf_export_status_check
      check (
        pdf_export_status is null
        or pdf_export_status in ('pending', 'processing', 'uploaded', 'failed', 'skipped')
      );
  end if;
end
$$;

create index if not exists documents_pdf_export_status_idx
  on public.documents(pdf_export_status);

create index if not exists documents_drive_pdf_file_id_idx
  on public.documents(drive_pdf_file_id);
