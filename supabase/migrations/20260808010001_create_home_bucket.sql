insert into storage.buckets (id, name, public)
values ('home', 'home', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
