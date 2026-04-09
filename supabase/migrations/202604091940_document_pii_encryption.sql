alter table public.documents
  add column if not exists customer_name_hash text not null default '',
  add column if not exists phone_last4_hash text not null default '',
  add column if not exists recipient_phone_hash text not null default '';

update public.documents
set recipient_phone = ''
where recipient_phone is null;

alter table public.documents
  alter column recipient_phone set not null;

alter table public.documents
  alter column customer_name_hash drop default,
  alter column phone_last4_hash drop default,
  alter column recipient_phone_hash drop default;

create index if not exists documents_customer_name_hash_idx
  on public.documents(customer_name_hash);

create index if not exists documents_phone_last4_hash_idx
  on public.documents(phone_last4_hash);

create index if not exists documents_recipient_phone_hash_idx
  on public.documents(recipient_phone_hash);
