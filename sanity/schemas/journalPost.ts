// Add to your Sanity Studio project's schema types, alongside siteSettings.ts.

import { defineField, defineType } from "sanity";

export const journalPost = defineType({
  name: "journalPost",
  title: "Journal Post",
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
      name: "tag",
      title: "Category",
      type: "string",
      options: { list: ["Curator Notes", "Artist Stories", "Exhibitions", "Market Analysis"] },
    }),
    defineField({ name: "excerpt", title: "Excerpt", type: "text", rows: 2 }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt text", type: "string" }],
    }),
    defineField({ name: "readMinutes", title: "Read time (minutes)", type: "number", initialValue: 5 }),
    defineField({ name: "publishedAt", title: "Published at", type: "datetime" }),
    defineField({ name: "body", title: "Body", type: "array", of: [{ type: "block" }] }),
  ],
  orderings: [{ title: "Newest first", name: "publishedDesc", by: [{ field: "publishedAt", direction: "desc" }] }],
  preview: { select: { title: "title", subtitle: "tag", media: "coverImage" } },
});
