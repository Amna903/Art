// Add to your Sanity Studio project's schema types, alongside the others.

import { defineField, defineType } from "sanity";

export const artist = defineType({
  name: "artist",
  title: "Artist",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "name" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "countryName", title: "Country", type: "string" }),
    defineField({ name: "countrySlug", title: "Country Slug", type: "string", description: "Must match a slug in the Atlas (e.g. 'nigeria')" }),
    defineField({ name: "countryCode", title: "Country Code", type: "string", description: "e.g. 'NG' — shown next to the city on artist cards" }),
    defineField({ name: "city", title: "City", type: "string" }),
    defineField({
      name: "technique",
      title: "Primary Technique",
      type: "string",
      options: { list: ["Painting", "Sculpture", "Photography", "Textile", "Digital", "Mixed Media"] },
    }),
    defineField({ name: "bio", title: "Bio", type: "text", rows: 4 }),
    defineField({ name: "artistStatement", title: "Artist Statement", type: "text", rows: 6 }),
    defineField({ name: "featuredWork", title: "Featured Work Title", type: "string" }),
    defineField({
      name: "portrait",
      title: "Portrait Image",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt text", type: "string" }],
    }),
    defineField({ name: "worksCount", title: "Works Count", type: "number" }),
    defineField({ name: "newDiscovery", title: "New Discovery?", type: "boolean", initialValue: false }),
  ],
  preview: { select: { title: "name", subtitle: "countryName", media: "portrait" } },
});
