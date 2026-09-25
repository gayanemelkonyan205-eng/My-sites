alter table public.homework add column if not exists resource_url text;
alter table public.homework add column if not exists file_id uuid references public.class_files(id) on delete set null;
alter table public.homework add constraint homework_resource_url_https check (resource_url is null or resource_url ~* '^https://[^[:space:]]+$');
