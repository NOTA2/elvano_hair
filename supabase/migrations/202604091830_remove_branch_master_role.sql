begin;

update public.admin_users
set role = 'admin'
where role = 'branch_master';

update public.sessions
set role = 'admin'
where role = 'branch_master';

alter table public.admin_users
  drop constraint if exists admin_users_role_check,
  drop constraint if exists admin_users_role_branch_check;

alter table public.admin_users
  add constraint admin_users_role_check
    check (role in ('integrated_master', 'admin')),
  add constraint admin_users_role_branch_check
    check (
      (role = 'integrated_master' and branch_id is null)
      or
      (role = 'admin' and branch_id is not null)
    );

alter table public.sessions
  drop constraint if exists sessions_role_check,
  drop constraint if exists sessions_role_branch_check;

alter table public.sessions
  add constraint sessions_role_check
    check (role in ('integrated_master', 'admin')),
  add constraint sessions_role_branch_check
    check (
      (role = 'integrated_master' and branch_id is null)
      or
      (role = 'admin' and branch_id is not null)
    );

commit;
