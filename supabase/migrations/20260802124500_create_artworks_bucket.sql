insert into storage.buckets (id, name, public)
values ('artworks', 'artworks', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;