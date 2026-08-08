import Link from "next/link";
import { EditableText } from "@/components/editing/EditableText";
import { EditableImage } from "@/components/editing/EditableImage";
import { blockText, blockImage, type PageBlocks } from "@/lib/data/pageBlocks";

const LOGO_SRC = "https://nu-artcollective.lovable.app/__l5e/assets-v1/f3356572-f5e6-4aa2-947a-5a9818d83640/logo.png";

export function Hero({ blocks }: { blocks: PageBlocks }) {
  const image = blockImage(blocks, "hero_image", { src: LOGO_SRC, alt: "NU-ART Collective" });

  return (
    <section className="nu-hero relative w-screen mx-[calc(50%-50vw)] overflow-hidden bg-background text-on-background transition-colors">
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none nu-hero-glow" />
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none nu-hero-dots" />

      <div className="relative max-w-container-max mx-auto px-gutter-page pt-40 lg:pt-44 pb-16 min-h-[92vh] flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-center gap-10 lg:gap-16 flex-1">
          {/* Headline */}
          <div className="relative max-w-xl order-last lg:order-none">
            <div className="mb-6">
              <EditableText
                page="home"
                blockKey="hero_eyebrow"
                value={blockText(blocks, "hero_eyebrow", "Est. 2024 — The Circle")}
                as="span"
                className="font-label-caps text-[10px] tracking-[0.32em] uppercase text-[#D4AF78]"
                multiline={false}
              />
            </div>
            <h1 className="font-display leading-[1.05] text-[clamp(2.2rem,3.6vw,3.2rem)] mb-6">
              <EditableText
                page="home"
                blockKey="hero_heading_line1"
                value={blockText(blocks, "hero_heading_line1", "Explore Africa.")}
                as="span"
                multiline={false}
              />
              <br />
              <span className="italic font-normal relative inline-block">
                <EditableText
                  page="home"
                  blockKey="hero_heading_line2"
                  value={blockText(blocks, "hero_heading_line2", "Discover Art.")}
                  as="span"
                  multiline={false}
                />
                <span className="absolute left-0 -bottom-1 h-[2px] w-[52%] bg-secondary" />
              </span>
            </h1>
            <EditableText
              page="home"
              blockKey="hero_subhead"
              value={blockText(
                blocks,
                "hero_subhead",
                "A curated platform dedicated to contemporary African artists. Each country, each culture, each story — collected with intent.",
              )}
              as="p"
              className="text-[0.95rem] leading-[1.75] text-on-surface-variant max-w-md"
            />
            <div className="mt-8 relative inline-block">
              <svg
                aria-hidden="true"
                className="absolute inset-0 -m-5 w-[calc(100%+2.5rem)] h-[calc(100%+2.5rem)] pointer-events-none"
                viewBox="0 0 140 80"
                preserveAspectRatio="none"
              >
                <path
                  d="M70,7 C92,7 116,16 124,36 C129,48 119,65 98,72 C80,77 52,76 36,68 C20,60 12,44 18,29 C24,14 47,5 70,7 Z"
                  fill="none"
                  stroke="#9F0D12"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.75"
                />
              </svg>
              <Link
                href="/artists"
                className="relative inline-flex items-center gap-2 px-6 py-3 text-[11px] font-label-caps tracking-[0.22em] uppercase bg-primary text-on-primary hover:bg-secondary hover:text-on-secondary transition-colors"
              >
                Explore artists
              </Link>
            </div>
          </div>

          {/* Animated logo */}
          <div className="relative flex items-center justify-center">
            <div className="relative aspect-square w-[min(88vw,560px)] flex items-center justify-center">
              <svg aria-hidden="true" viewBox="0 0 400 400" className="absolute inset-0 w-full h-full nu-orbit">
                <defs>
                  <linearGradient id="orbitGrad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#9F0D12" stopOpacity="0" />
                    <stop offset="45%" stopColor="#9F0D12" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#D4AF78" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <circle
                  cx="200"
                  cy="200"
                  r="188"
                  fill="none"
                  stroke="url(#orbitGrad)"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeDasharray="620 560"
                  className="nu-orbit-arc"
                />
                <circle
                  cx="200"
                  cy="200"
                  r="170"
                  fill="none"
                  stroke="#D4AF78"
                  strokeWidth="0.6"
                  strokeOpacity="0.22"
                  strokeDasharray="1 6"
                />
              </svg>
              <div
                aria-hidden="true"
                className="absolute inset-[12%] rounded-full nu-breathe nu-halo-bg"
                style={{ filter: "blur(12px)" }}
              />
              <EditableImage
                page="home"
                blockKey="hero_image"
                bucket="home"
                fit="contain"
                src={image.src}
                alt={image.alt}
                className="relative z-10 w-[68%] h-auto nu-logo-in nu-logo-img"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
