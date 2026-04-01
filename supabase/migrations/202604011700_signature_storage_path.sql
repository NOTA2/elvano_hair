begin;

alter table public.documents
rename column signature_data_url to signature_storage_path;

update public.documents
set
  signature_storage_path = null,
  signed_at = null,
  status = 'pending',
  updated_at = timezone('utc', now())
where signature_storage_path is not null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'document-signatures',
  'document-signatures',
  true,
  1048576,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
