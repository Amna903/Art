// Add to your Sanity Studio project's schema types, alongside the others.

import { defineField, defineType } from "sanity";

export const artwork = defineType({
  name: "artwork",
  title: "Artwork",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "artist",
      title: "Artist",
      type: "reference",
      to: [{ type: "artist" }],
    }),
    defineField({ name: "medium", title: "Medium", type: "string", description: "e.g. 'Oil on linen, 120 x 120cm'" }),
    defineField({ name: "year", title: "Year", type: "number" }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt text", type: "string" }],
    }),
    defineField({ name: "story", title: "Story / Description", type: "text", rows: 4 }),
    defineField({ name: "collection", title: "Collection Name", type: "string", description: "e.g. 'KODU COLLECTION'" }),
    // NOTE: intentionally no public "price" field — per the Price Upon
    // Request policy, pricing is handled entirely through the enquiries
    // flow (see lib/data/enquiries.ts), not stored/displayed per artwork.
  ],
  preview: { select: { title: "title", subtitle: "medium", media: "image" } },
});
