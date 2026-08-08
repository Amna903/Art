// Add this file to your Sanity Studio project's schema types
// (e.g. schemaTypes/siteSettings.ts), then include it in your
// sanity.config.ts `schema.types` array.
//
// This is a SINGLETON document — there should only ever be one. Studio setup
// for that (recommended): in your Structure Builder, list it as a single
// document link rather than a document list, e.g.:
//
//   S.listItem()
//     .title('Site Settings')
//     .child(S.document().schemaType('siteSettings').documentId('siteSettings'))

import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "heroImage",
      title: "Homepage Hero Image",
      type: "image",
      options: { hotspot: true },
      description: "Replaces the animated logo art on the homepage hero. Recommended: square, at least 1200x1200.",
    }),
    defineField({
      name: "heroHeadlineLine1",
      title: "Hero Headline — Line 1",
      type: "string",
      initialValue: "Explore Africa.",
    }),
    defineField({
      name: "heroHeadlineLine2",
      title: "Hero Headline — Line 2 (italic)",
      type: "string",
      initialValue: "Discover Art.",
    }),
    defineField({
      name: "heroBody",
      title: "Hero Body Copy",
      type: "text",
      rows: 3,
    }),
  ],
  preview: {
    prepare() {
      return { title: "Site Settings" };
    },
  },
});
