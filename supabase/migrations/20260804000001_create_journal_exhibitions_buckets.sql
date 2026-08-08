insert into storage.buckets (id, name, public)
values ('journal', 'journal', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

insert into storage.buckets (id, name, public)
values ('exhibitions', 'exhibitions', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
