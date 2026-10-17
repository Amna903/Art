/**
 * Quotes for the dedicated quote element ("Voices & vision", 9 Oct 2026).
 * One quote is shown at a time, with clear attribution; the source stays in
 * the record. These are distinct from the featured artists' own words, which
 * are added as approved interviews arrive.
 *
 * Quotations are shown in their original English in every language: they
 * are someone's exact words.
 */
export type Quote = {
  id: string;
  text: string;
  author: string;
  role: string;
  source: string;
  /** Where the editorial collection suggests placing it. */
  placement: "about" | "virtual-gallery" | "explore-by-country" | "journal";
  /** Only approved quotes are shown on public pages. */
  approved: boolean;
};

export const QUOTES: Quote[] = [
  {
    id: "anane-purpose",
    text: "I chose the art before I knew the stories. When I discovered the people behind it, my connection became a purpose.",
    author: "Anané Vega",
    role: "Founder & Curator, NUA-ARTE",
    source: "Original wording proposed for Anané's approval (Voices & vision, 9 Oct 2026).",
    placement: "about",
    // Flip to true once Anané approves the wording.
    approved: false,
  },
  {
    id: "anatsui-spiritual",
    text: "If there is something that I think art does, I think it awakens the spiritual.",
    author: "El Anatsui",
    role: "Ghanaian artist",
    source: "Art21, Season Six Educators' Guide, printed page 14.",
    placement: "virtual-gallery",
    approved: true,
  },
  {
    id: "anatsui-borders",
    text: "Ideas and creativity are not restricted to any one place.",
    author: "El Anatsui",
    role: "Ghanaian artist",
    source: "Art Fund interview, 29 November 2023. Sentence excerpt.",
    placement: "explore-by-country",
    approved: true,
  },
  {
    id: "adichie-stories",
    text: "Stories matter. Many stories matter.",
    author: "Chimamanda Ngozi Adichie",
    role: "Nigerian writer",
    source: "TED, The danger of a single story, 2009.",
    placement: "journal",
    approved: true,
  },
];

/** The approved quote for a placement. In local development, unapproved
 * quotes are shown too so their layout can be reviewed. */
export function quoteFor(placement: Quote["placement"]): Quote | undefined {
  return QUOTES.find((q) => q.placement === placement && (q.approved || process.env.NODE_ENV === "development"));
}
