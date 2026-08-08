// Add to your Sanity Studio project's schema types, alongside siteSettings.ts.

import { defineField, defineType } from "sanity";

export const exhibition = defineType({
  name: "exhibition",
  title: "Exhibition",
  type: "document",
  fields: [
    defineField({ name: "title", title: "Title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "status",
      title: "Status",
      type: "string",
      options: { list: ["upcoming", "current", "past"] },
      initialValue: "upcoming",
    }),
    defineField({ name: "location", title: "Location", type: "string", description: "e.g. Lagos, Nigeria — or 'Online Only'" }),
    defineField({ name: "dateLabel", title: "Date label", type: "string", description: "e.g. 'NOVEMBER 2026'" }),
    defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
    defineField({
      name: "coverImage",
      title: "Cover Image",
      type: "image",
      options: { hotspot: true },
      fields: [{ name: "alt", title: "Alt text", type: "string" }],
    }),
  ],
  orderings: [{ title: "Date label", name: "dateLabelAsc", by: [{ field: "dateLabel", direction: "asc" }] }],
  preview: { select: { title: "title", subtitle: "location", media: "coverImage" } },
});
