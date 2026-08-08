import type { Metadata } from "next";
import { getExhibitions } from "@/lib/sanity/queries";
import { getPublishedExhibitions } from "@/lib/data/exhibitions";
import { getPageBlocks, blockText, blockImage } from "@/lib/data/pageBlocks";
import { EditableText } from "@/components/editing/EditableText";
import { EditableImage } from "@/components/editing/EditableImage";
import { ExhibitionsGrid } from "@/components/editing/ExhibitionsGrid";

export const metadata: Metadata = {
  title: "Virtual & Global Exhibitions | NU-ART",
  description: "NU-ART — contemporary African art movement.",
};

// Matches the 60s window the underlying Supabase/Sanity reads are cached at.
export const revalidate = 60;

const A = "https://nu-artcollective.lovable.app/__l5e/assets-v1";

const FALLBACK_UPCOMING = [
  {
    month: "NOVEMBER 2024",
    title: "The New Vanguard",
    body: "Spotlighting 20 emerging artists under 30 from across the continent.",
    img: `${A}/2f15c99e-87ab-412d-88ad-ead477c66ef0/afr-artist-portrait.jpg`,
    alt: "A minimalist architectural photograph of a new modern gallery space with large windows and high ceilings, empty and awaiting an exhibition.",
  },
  {
    month: "DECEMBER 2024",
    title: "Ancestral Futures",
    body: "Afrofuturism in painting and mixed media sculpture.",
    img: `${A}/962ca422-ea96-4526-86bf-114414bf21e6/afr-culture-portrait.jpg`,
    alt: "A conceptual art piece showing a digital portal in a traditional courtyard setting, in earth tones with modern digital blue highlights.",
  },
  {
    month: "JANUARY 2025",
    title: "Chromotherapy",
    body: "A solo exhibition by Tunde Fadeyi exploring the psychology of color.",
    img: `${A}/a820f217-1476-433e-9017-b7e8bc4d6e4b/afr-painting-abstract.jpg`,
    alt: "A macro photograph of vibrant pigments being mixed on a wooden palette, sharply focused with shallow depth of field.",
  },
];

export default async function ExhibitionsPage() {
  const [supaExhibitions, cmsExhibitions, blocks] = await Promise.all([
    getPublishedExhibitions(),
    getExhibitions(),
    getPageBlocks("exhibitions"),
  ]);

  const fallbackItems =
    cmsExhibitions.length > 0
      ? cmsExhibitions.map((e) => ({
          month: e.dateLabel ?? "",
          title: e.title,
          body: e.description ?? "",
          img: e.imageUrl ?? `${A}/2f15c99e-87ab-412d-88ad-ead477c66ef0/afr-artist-portrait.jpg`,
          alt: e.imageAlt ?? e.title,
        }))
      : FALLBACK_UPCOMING;

  const featureImg = blockImage(blocks, "feature_image", {
    src: `${A}/8fb36909-f581-4701-9e44-3a179fcb76d5/afr-ceramic.jpg`,
    alt: "A high-contrast cinematic photograph of a grand museum gallery showing large-scale contemporary African paintings against pristine white walls.",
  });
  const side1Img = blockImage(blocks, "side1_image", {
    src: `${A}/047a8f56-5cc6-48eb-8d6b-4c1254b37d70/afr-ritual-bw.jpg`,
    alt: "A minimalist digital artwork featuring abstract geometric patterns inspired by traditional African weaving techniques.",
  });
  const side2Img = blockImage(blocks, "side2_image", {
    src: `${A}/962ca422-ea96-4526-86bf-114414bf21e6/afr-culture-portrait.jpg`,
    alt: "A portrait-oriented photograph of a series of contemporary ceramic vessels in an art gallery, softly lit.",
  });
  const gallery1Img = blockImage(blocks, "gallery1_image", {
    src: `${A}/04f8502e-a9bb-4275-9ace-a1f2f752eae2/afr-mixedmedia.jpg`,
    alt: "A minimalist abstract oil painting with sweeping strokes of black and grey and a singular red line, framed on an off-white gallery wall.",
  });
  const gallery2Img = blockImage(blocks, "gallery2_image", {
    src: `${A}/8fb36909-f581-4701-9e44-3a179fcb76d5/afr-ceramic.jpg`,
    alt: "A detailed close-up of a modern sculpture made from recycled bronze and copper wires.",
  });
  const gallery3Img = blockImage(blocks, "gallery3_image", {
    src: `${A}/dc981581-67cc-4c92-881e-bbb825d6b9c6/afr-street-lagos.jpg`,
    alt: "A large-scale mixed media work on raw canvas, featuring bold indigo dyes and delicate embroidery.",
  });
  const gallery4Img = blockImage(blocks, "gallery4_image", {
    src: `${A}/a820f217-1476-433e-9017-b7e8bc4d6e4b/afr-painting-abstract.jpg`,
    alt: "A sophisticated photograph of an art installation with translucent screens projecting African landscapes in a dark room.",
  });

  return (
    <main className="max-w-container-max mx-auto px-gutter-page">
      <section className="mt-section-gap mb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <span className="font-label-caps text-label-caps text-secondary mb-4 block">EXHIBITIONS PROGRAM</span>
            <h1 className="font-display-lg text-display-lg leading-none">
              <EditableText
                page="exhibitions"
                blockKey="hero_heading_line1"
                value={blockText(blocks, "hero_heading_line1", "Curation of")}
                as="span"
                multiline={false}
              />
              <br />
              <EditableText
                page="exhibitions"
                blockKey="hero_heading_line2"
                value={blockText(blocks, "hero_heading_line2", "Modern Spirit")}
                as="span"
                multiline={false}
              />
            </h1>
          </div>
          <div className="flex gap-8 border-b border-outline/20 pb-4">
            <button className="font-navigation text-navigation uppercase tracking-widest text-secondary border-b border-secondary pb-4 -mb-4.5">
              Current
            </button>
            <button className="font-navigation text-navigation uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
              Upcoming
            </button>
            <button className="font-navigation text-navigation uppercase tracking-widest text-on-surface-variant hover:text-primary transition-colors">
              Past
            </button>
          </div>
        </div>
      </section>

      <section className="mb-section-gap">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-start">
          <div className="md:col-span-8 group cursor-pointer">
            <div className="overflow-hidden mb-8 relative">
              <EditableImage
                page="exhibitions"
                blockKey="feature_image"
                bucket="exhibitions"
                src={featureImg.src}
                alt={featureImg.alt}
                className="w-full aspect-[16/9] grayscale-[30%] group-hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute top-6 left-6 bg-secondary text-on-primary px-4 py-1 font-label-caps text-label-caps">
                LIVE NOW
              </div>
            </div>
            <div className="flex gap-12">
              <div className="vertical-thread h-32 hidden md:block" />
              <div>
                <EditableText
                  page="exhibitions"
                  blockKey="feature_location"
                  value={blockText(blocks, "feature_location", "Physical Exhibition • Lagos, Nigeria")}
                  as="span"
                  className="font-label-caps text-label-caps text-on-surface-variant block mb-2 uppercase"
                  multiline={false}
                />
                <EditableText
                  page="exhibitions"
                  blockKey="feature_title"
                  value={blockText(blocks, "feature_title", "The Geometry of Silence")}
                  as="h2"
                  className="font-headline-md text-headline-md mb-4 group-hover:text-secondary transition-colors duration-300"
                  multiline={false}
                />
                <EditableText
                  page="exhibitions"
                  blockKey="feature_description"
                  value={blockText(
                    blocks,
                    "feature_description",
                    "An immersive study of spatial consciousness through the lens of West African modernist sculpture. Curated by Amara Okafor, this exhibition brings together twelve pioneering artists redefining minimalist form.",
                  )}
                  as="p"
                  className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mb-8 leading-relaxed"
                />
                <div className="flex items-center gap-6">
                  <EditableText
                    page="exhibitions"
                    blockKey="feature_dates"
                    value={blockText(blocks, "feature_dates", "SEPT 12 — OCT 30")}
                    as="span"
                    className="font-label-caps text-label-caps text-primary"
                    multiline={false}
                  />
                  <div className="hand-drawn-circle">
                    <button className="font-navigation text-navigation uppercase tracking-widest px-4 py-2 hover:text-secondary transition-colors">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 mt-20 md:mt-0 space-y-24">
            <div className="group cursor-pointer">
              <div className="mb-6">
                <EditableImage
                  page="exhibitions"
                  blockKey="side1_image"
                  bucket="exhibitions"
                  src={side1Img.src}
                  alt={side1Img.alt}
                  className="w-full aspect-square mb-6"
                />
                <EditableText
                  page="exhibitions"
                  blockKey="side1_category"
                  value={blockText(blocks, "side1_category", "Online Only • Digital Gallery")}
                  as="span"
                  className="font-label-caps text-label-caps text-on-surface-variant block mb-2 uppercase"
                  multiline={false}
                />
                <EditableText
                  page="exhibitions"
                  blockKey="side1_title"
                  value={blockText(blocks, "side1_title", "Digital Threads")}
                  as="h3"
                  className="font-headline-sm text-headline-sm mb-2 group-hover:text-secondary transition-colors"
                  multiline={false}
                />
                <EditableText
                  page="exhibitions"
                  blockKey="side1_description"
                  value={blockText(
                    blocks,
                    "side1_description",
                    "Exploring the intersection of generative algorithms and indigenous textile motifs.",
                  )}
                  as="p"
                  className="font-body-md text-body-md text-on-surface-variant mb-4"
                />
                <button className="font-navigation text-navigation uppercase tracking-widest text-primary border-b border-primary/20 hover:border-secondary transition-all">
                  Enter Gallery
                </button>
              </div>
            </div>
            <div className="group cursor-pointer">
              <div className="mb-6">
                <EditableImage
                  page="exhibitions"
                  blockKey="side2_image"
                  bucket="exhibitions"
                  src={side2Img.src}
                  alt={side2Img.alt}
                  className="w-full aspect-square mb-6"
                />
                <EditableText
                  page="exhibitions"
                  blockKey="side2_category"
                  value={blockText(blocks, "side2_category", "Physical • Cape Town")}
                  as="span"
                  className="font-label-caps text-label-caps text-on-surface-variant block mb-2 uppercase"
                  multiline={false}
                />
                <EditableText
                  page="exhibitions"
                  blockKey="side2_title"
                  value={blockText(blocks, "side2_title", "Clay & Consciousness")}
                  as="h3"
                  className="font-headline-sm text-headline-sm mb-2 group-hover:text-secondary transition-colors"
                  multiline={false}
                />
                <EditableText
                  page="exhibitions"
                  blockKey="side2_description"
                  value={blockText(
                    blocks,
                    "side2_description",
                    "A tactile journey through modern ceramic practices in Southern Africa.",
                  )}
                  as="p"
                  className="font-body-md text-body-md text-on-surface-variant mb-4"
                />
                <button className="font-navigation text-navigation uppercase tracking-widest text-primary border-b border-primary/20 hover:border-secondary transition-all">
                  Explore Works
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="w-full h-px bg-primary/10 mb-section-gap" />

      <section className="mb-section-gap">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
          <div className="md:col-span-4 museum-signage">
            <span className="font-label-caps text-label-caps text-secondary block mb-4">EXHIBITION HIGHLIGHT</span>
            <h2 className="font-headline-md text-headline-md mb-8">
              <EditableText
                page="exhibitions"
                blockKey="highlight_heading_line1"
                value={blockText(blocks, "highlight_heading_line1", "Echoes of the")}
                as="span"
                multiline={false}
              />
              <br />
              <EditableText
                page="exhibitions"
                blockKey="highlight_heading_line2"
                value={blockText(blocks, "highlight_heading_line2", "Distant Horizon")}
                as="span"
                multiline={false}
              />
            </h2>
            <div className="space-y-6">
              <div>
                <p className="font-label-caps text-label-caps opacity-50 mb-1">PARTICIPATING ARTISTS</p>
                <EditableText
                  page="exhibitions"
                  blockKey="highlight_artists"
                  value={blockText(blocks, "highlight_artists", "Koffi Mensah, Zanele Abena, Tunde Fadeyi, Ifeoma Uzor")}
                  as="p"
                  className="font-body-md text-body-md"
                  multiline={false}
                />
              </div>
              <div>
                <p className="font-label-caps text-label-caps opacity-50 mb-1">CURATORIAL NOTE</p>
                <EditableText
                  page="exhibitions"
                  blockKey="highlight_note"
                  value={blockText(
                    blocks,
                    "highlight_note",
                    "This exhibition explores the conceptual boundaries of landscape painting, shifting from literal representation to emotional topography. The red thread running through each work signifies a shared ancestral memory that transcends physical borders.",
                  )}
                  as="p"
                  className="font-body-md text-body-md leading-relaxed"
                />
              </div>
              <div className="pt-6">
                <button className="bg-primary text-on-primary w-full py-4 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary transition-colors flex items-center justify-center gap-3">
                  Collect from Exhibition
                  <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-8">
            <div className="grid grid-cols-2 gap-gutter">
              <div className="space-y-gutter">
                <div className="relative overflow-hidden group">
                  <EditableImage
                    page="exhibitions"
                    blockKey="gallery1_image"
                    bucket="exhibitions"
                    src={gallery1Img.src}
                    alt={gallery1Img.alt}
                    className="w-full h-[400px] group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-4 bg-background">
                    <EditableText
                      page="exhibitions"
                      blockKey="gallery1_artist"
                      value={blockText(blocks, "gallery1_artist", "Koffi Mensah")}
                      as="p"
                      className="font-label-caps text-label-caps mb-1"
                      multiline={false}
                    />
                    <EditableText
                      page="exhibitions"
                      blockKey="gallery1_work"
                      value={blockText(blocks, "gallery1_work", "Sovereign Dusk, 2023")}
                      as="p"
                      className="font-body-md text-body-md italic opacity-70"
                      multiline={false}
                    />
                  </div>
                </div>
                <div className="relative overflow-hidden group">
                  <EditableImage
                    page="exhibitions"
                    blockKey="gallery2_image"
                    bucket="exhibitions"
                    src={gallery2Img.src}
                    alt={gallery2Img.alt}
                    className="w-full h-[300px] group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-4 bg-background">
                    <EditableText
                      page="exhibitions"
                      blockKey="gallery2_artist"
                      value={blockText(blocks, "gallery2_artist", "Tunde Fadeyi")}
                      as="p"
                      className="font-label-caps text-label-caps mb-1"
                      multiline={false}
                    />
                    <EditableText
                      page="exhibitions"
                      blockKey="gallery2_work"
                      value={blockText(blocks, "gallery2_work", "Kinetic Lineage, 2024")}
                      as="p"
                      className="font-body-md text-body-md italic opacity-70"
                      multiline={false}
                    />
                  </div>
                </div>
              </div>
              <div className="pt-20 space-y-gutter">
                <div className="relative overflow-hidden group">
                  <EditableImage
                    page="exhibitions"
                    blockKey="gallery3_image"
                    bucket="exhibitions"
                    src={gallery3Img.src}
                    alt={gallery3Img.alt}
                    className="w-full h-[350px] group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-4 bg-background">
                    <EditableText
                      page="exhibitions"
                      blockKey="gallery3_artist"
                      value={blockText(blocks, "gallery3_artist", "Zanele Abena")}
                      as="p"
                      className="font-label-caps text-label-caps mb-1"
                      multiline={false}
                    />
                    <EditableText
                      page="exhibitions"
                      blockKey="gallery3_work"
                      value={blockText(blocks, "gallery3_work", "Oceanic Memory, 2024")}
                      as="p"
                      className="font-body-md text-body-md italic opacity-70"
                      multiline={false}
                    />
                  </div>
                </div>
                <div className="relative overflow-hidden group">
                  <EditableImage
                    page="exhibitions"
                    blockKey="gallery4_image"
                    bucket="exhibitions"
                    src={gallery4Img.src}
                    alt={gallery4Img.alt}
                    className="w-full h-[450px] group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="p-4 bg-background">
                    <EditableText
                      page="exhibitions"
                      blockKey="gallery4_artist"
                      value={blockText(blocks, "gallery4_artist", "Ifeoma Uzor")}
                      as="p"
                      className="font-label-caps text-label-caps mb-1"
                      multiline={false}
                    />
                    <EditableText
                      page="exhibitions"
                      blockKey="gallery4_work"
                      value={blockText(blocks, "gallery4_work", "Transience, 2023")}
                      as="p"
                      className="font-body-md text-body-md italic opacity-70"
                      multiline={false}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-section-gap">
        <div className="flex items-center gap-6 mb-12">
          <h2 className="font-headline-sm text-headline-sm">Upcoming Calendars</h2>
          <div className="flex-grow h-px bg-primary/10" />
        </div>
        <ExhibitionsGrid initialItems={supaExhibitions} fallbackItems={fallbackItems} />
      </section>
    </main>
  );
}
