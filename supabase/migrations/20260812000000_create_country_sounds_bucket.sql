insert into storage.buckets (id, name, public)
values ('country-sounds', 'country-sounds', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;
