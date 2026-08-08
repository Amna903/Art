// 54 African countries — single source of truth for routing, galleries, and badges.

export type Country = {
  slug: string;
  code: string; // ISO A3
  name: string; // English (matches geojson ADMIN)
  namePt: string;
  flag: string;
  capital: string;
  region: "North" | "West" | "Central" | "East" | "Southern";
  blurb: string;
};

export const AFRICAN_COUNTRIES: Country[] = [
  { slug: "algeria", code: "DZA", name: "Algeria", namePt: "Argélia", flag: "🇩🇿", capital: "Algiers", region: "North", blurb: "Saharan calligraphy meets Mediterranean modernism." },
  { slug: "angola", code: "AGO", name: "Angola", namePt: "Angola", flag: "🇦🇴", capital: "Luanda", region: "Southern", blurb: "Luanda's urban pulse and Kuduro rhythm in painting." },
  { slug: "benin", code: "BEN", name: "Benin", namePt: "Benim", flag: "🇧🇯", capital: "Porto-Novo", region: "West", blurb: "Vodun iconography reimagined for the contemporary." },
  { slug: "botswana", code: "BWA", name: "Botswana", namePt: "Botswana", flag: "🇧🇼", capital: "Gaborone", region: "Southern", blurb: "Kalahari minimalism and San heritage visuals." },
  { slug: "burkina-faso", code: "BFA", name: "Burkina Faso", namePt: "Burkina Faso", flag: "🇧🇫", capital: "Ouagadougou", region: "West", blurb: "Bronze casting traditions and FESPACO cinema spirit." },
  { slug: "burundi", code: "BDI", name: "Burundi", namePt: "Burundi", flag: "🇧🇮", capital: "Gitega", region: "East", blurb: "Drum-led narratives and lakeside palettes." },
  { slug: "cabo-verde", code: "CPV", name: "Cabo Verde", namePt: "Cabo Verde", flag: "🇨🇻", capital: "Praia", region: "West", blurb: "Atlantic creolité — morna and pastel salt-flat hues." },
  { slug: "cameroon", code: "CMR", name: "Cameroon", namePt: "Camarões", flag: "🇨🇲", capital: "Yaoundé", region: "Central", blurb: "Bamileke masks recoded in mixed media." },
  { slug: "central-african-republic", code: "CAF", name: "Central African Republic", namePt: "República Centro-Africana", flag: "🇨🇫", capital: "Bangui", region: "Central", blurb: "Forest cosmologies told in bark and pigment." },
  { slug: "chad", code: "TCD", name: "Chad", namePt: "Chade", flag: "🇹🇩", capital: "N'Djamena", region: "Central", blurb: "Sahel light and Lake Chad textile geometry." },
  { slug: "comoros", code: "COM", name: "Comoros", namePt: "Comores", flag: "🇰🇲", capital: "Moroni", region: "East", blurb: "Volcanic island layering and Swahili calligraphy." },
  { slug: "congo", code: "COG", name: "Republic of the Congo", namePt: "Congo", flag: "🇨🇬", capital: "Brazzaville", region: "Central", blurb: "Brazzaville's school of painting and river myth." },
  { slug: "drc", code: "COD", name: "Democratic Republic of the Congo", namePt: "República Democrática do Congo", flag: "🇨🇩", capital: "Kinshasa", region: "Central", blurb: "Kinshasa SAPE, rumba, and urban surrealism." },
  { slug: "djibouti", code: "DJI", name: "Djibouti", namePt: "Djibouti", flag: "🇩🇯", capital: "Djibouti", region: "East", blurb: "Salt lakes, Afar nomadism, port-city collage." },
  { slug: "egypt", code: "EGY", name: "Egypt", namePt: "Egipto", flag: "🇪🇬", capital: "Cairo", region: "North", blurb: "From hieroglyph to Cairo's contemporary scene." },
  { slug: "equatorial-guinea", code: "GNQ", name: "Equatorial Guinea", namePt: "Guiné Equatorial", flag: "🇬🇶", capital: "Malabo", region: "Central", blurb: "Fang sculpture lineages and island modernism." },
  { slug: "eritrea", code: "ERI", name: "Eritrea", namePt: "Eritreia", flag: "🇪🇷", capital: "Asmara", region: "East", blurb: "Asmara modernist architecture as visual grammar." },
  { slug: "eswatini", code: "SWZ", name: "eSwatini", namePt: "Eswatini", flag: "🇸🇿", capital: "Mbabane", region: "Southern", blurb: "Reed dance pageantry and beadwork as code." },
  { slug: "ethiopia", code: "ETH", name: "Ethiopia", namePt: "Etiópia", flag: "🇪🇹", capital: "Addis Ababa", region: "East", blurb: "Lalibela iconography meets Addis avant-garde." },
  { slug: "gabon", code: "GAB", name: "Gabon", namePt: "Gabão", flag: "🇬🇦", capital: "Libreville", region: "Central", blurb: "Equatorial green and Bwiti spiritual abstraction." },
  { slug: "gambia", code: "GMB", name: "Gambia", namePt: "Gâmbia", flag: "🇬🇲", capital: "Banjul", region: "West", blurb: "River-line storytelling and griot portraiture." },
  { slug: "ghana", code: "GHA", name: "Ghana", namePt: "Gana", flag: "🇬🇭", capital: "Accra", region: "West", blurb: "Adinkra symbology in the Accra new-wave." },
  { slug: "guinea", code: "GIN", name: "Guinea", namePt: "Guiné", flag: "🇬🇳", capital: "Conakry", region: "West", blurb: "Djembé rhythm translated into chromatic studies." },
  { slug: "guinea-bissau", code: "GNB", name: "Guinea-Bissau", namePt: "Guiné-Bissau", flag: "🇬🇼", capital: "Bissau", region: "West", blurb: "Bijagós cosmology and post-independence printmaking." },
  { slug: "ivory-coast", code: "CIV", name: "Ivory Coast", namePt: "Costa do Marfim", flag: "🇨🇮", capital: "Yamoussoukro", region: "West", blurb: "Vohou-Vohou movement and Abidjan abstraction." },
  { slug: "kenya", code: "KEN", name: "Kenya", namePt: "Quénia", flag: "🇰🇪", capital: "Nairobi", region: "East", blurb: "Nairobi-tech aesthetics and Maasai chromatics." },
  { slug: "lesotho", code: "LSO", name: "Lesotho", namePt: "Lesoto", flag: "🇱🇸", capital: "Maseru", region: "Southern", blurb: "Basotho blankets as canvas and code." },
  { slug: "liberia", code: "LBR", name: "Liberia", namePt: "Libéria", flag: "🇱🇷", capital: "Monrovia", region: "West", blurb: "Diaspora returns and Monrovia mural revival." },
  { slug: "libya", code: "LBY", name: "Libya", namePt: "Líbia", flag: "🇱🇾", capital: "Tripoli", region: "North", blurb: "Saharan rock-art lineage in contemporary form." },
  { slug: "madagascar", code: "MDG", name: "Madagascar", namePt: "Madagáscar", flag: "🇲🇬", capital: "Antananarivo", region: "East", blurb: "Endemic biota as palette and pattern source." },
  { slug: "malawi", code: "MWI", name: "Malawi", namePt: "Malawi", flag: "🇲🇼", capital: "Lilongwe", region: "Southern", blurb: "Lake-light realism and Gule Wamkulu mask studies." },
  { slug: "mali", code: "MLI", name: "Mali", namePt: "Mali", flag: "🇲🇱", capital: "Bamako", region: "West", blurb: "Bogolan mud-cloth meets Bamako photography." },
  { slug: "mauritania", code: "MRT", name: "Mauritania", namePt: "Mauritânia", flag: "🇲🇷", capital: "Nouakchott", region: "North", blurb: "Desert silence and Moorish illumination." },
  { slug: "mauritius", code: "MUS", name: "Mauritius", namePt: "Maurícia", flag: "🇲🇺", capital: "Port Louis", region: "East", blurb: "Creole layering: Indian Ocean modernism." },
  { slug: "morocco", code: "MAR", name: "Morocco", namePt: "Marrocos", flag: "🇲🇦", capital: "Rabat", region: "North", blurb: "Zellige geometry and Tangier school colour." },
  { slug: "mozambique", code: "MOZ", name: "Mozambique", namePt: "Moçambique", flag: "🇲🇿", capital: "Maputo", region: "Southern", blurb: "Makonde carving and Malangatana legacy." },
  { slug: "namibia", code: "NAM", name: "Namibia", namePt: "Namíbia", flag: "🇳🇦", capital: "Windhoek", region: "Southern", blurb: "Namib dune minimalism and Herero portraiture." },
  { slug: "niger", code: "NER", name: "Niger", namePt: "Níger", flag: "🇳🇪", capital: "Niamey", region: "West", blurb: "Tuareg jewellery as sculptural language." },
  { slug: "nigeria", code: "NGA", name: "Nigeria", namePt: "Nigéria", flag: "🇳🇬", capital: "Abuja", region: "West", blurb: "Lagos new-wave: Nollywood, Afrobeats, Nsukka." },
  { slug: "rwanda", code: "RWA", name: "Rwanda", namePt: "Ruanda", flag: "🇷🇼", capital: "Kigali", region: "East", blurb: "Imigongo geometry and post-memory practice." },
  { slug: "sao-tome", code: "STP", name: "São Tomé and Principe", namePt: "São Tomé e Príncipe", flag: "🇸🇹", capital: "São Tomé", region: "Central", blurb: "Equator islands: cocoa, basalt, and brushwork." },
  { slug: "senegal", code: "SEN", name: "Senegal", namePt: "Senegal", flag: "🇸🇳", capital: "Dakar", region: "West", blurb: "Teranga: from indigo to Dakar's digital horizon." },
  { slug: "seychelles", code: "SYC", name: "Seychelles", namePt: "Seychelles", flag: "🇸🇨", capital: "Victoria", region: "East", blurb: "Granitic shores and Creole modernism." },
  { slug: "sierra-leone", code: "SLE", name: "Sierra Leone", namePt: "Serra Leoa", flag: "🇸🇱", capital: "Freetown", region: "West", blurb: "Krio identity and post-war reconstruction art." },
  { slug: "somalia", code: "SOM", name: "Somalia", namePt: "Somália", flag: "🇸🇴", capital: "Mogadishu", region: "East", blurb: "Poetic tradition reborn in visual code." },
  { slug: "south-africa", code: "ZAF", name: "South Africa", namePt: "África do Sul", flag: "🇿🇦", capital: "Pretoria", region: "Southern", blurb: "Joburg, Cape Town: post-apartheid avant-garde." },
  { slug: "south-sudan", code: "SSD", name: "South Sudan", namePt: "Sudão do Sul", flag: "🇸🇸", capital: "Juba", region: "East", blurb: "Cattle-camp aesthetics and emerging Juba scene." },
  { slug: "sudan", code: "SDN", name: "Sudan", namePt: "Sudão", flag: "🇸🇩", capital: "Khartoum", region: "North", blurb: "Khartoum school: Arabic letterforms reimagined." },
  { slug: "tanzania", code: "TZA", name: "United Republic of Tanzania", namePt: "Tanzânia", flag: "🇹🇿", capital: "Dodoma", region: "East", blurb: "Tingatinga lineage and Zanzibar's stone city." },
  { slug: "togo", code: "TGO", name: "Togo", namePt: "Togo", flag: "🇹🇬", capital: "Lomé", region: "West", blurb: "Lomé craft tradition and coastal abstraction." },
  { slug: "tunisia", code: "TUN", name: "Tunisia", namePt: "Tunísia", flag: "🇹🇳", capital: "Tunis", region: "North", blurb: "Sidi Bou Said blues and Carthage palimpsest." },
  { slug: "uganda", code: "UGA", name: "Uganda", namePt: "Uganda", flag: "🇺🇬", capital: "Kampala", region: "East", blurb: "Bark-cloth heritage and Kampala studio scene." },
  { slug: "zambia", code: "ZMB", name: "Zambia", namePt: "Zâmbia", flag: "🇿🇲", capital: "Lusaka", region: "Southern", blurb: "Copperbelt industrial form and Lusaka new-wave." },
  { slug: "zimbabwe", code: "ZWE", name: "Zimbabwe", namePt: "Zimbabwe", flag: "🇿🇼", capital: "Harare", region: "Southern", blurb: "Shona stone sculpture: a global vocabulary." },
];

// Island-nation pin overrides — geojson at 50m omits or shrinks these.
// [lon, lat]
export const ISLAND_PINS: Record<string, [number, number]> = {
  "cabo-verde": [-23.6, 15.1],
  comoros: [43.34, -11.65],
  mauritius: [57.55, -20.35],
  seychelles: [55.49, -4.62],
  "sao-tome": [6.7, 0.33],
};

export function getCountryBySlug(slug: string): Country | undefined {
  return AFRICAN_COUNTRIES.find((c) => c.slug === slug);
}

export function getCountryByGeoName(name: string): Country | undefined {
  return AFRICAN_COUNTRIES.find((c) => c.name === name);
}

// ---------- Deterministic mock content per country ----------

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

const PALETTES = ["EB5E28", "B9100B", "1B1C1B", "E4DBD5", "C2410C", "7C2D12", "0F172A", "57534E"];
const TECHNIQUES = [
  "Mixed media on canvas",
  "Oil and indigo on linen",
  "Bronze cast (edition of 5)",
  "Archival pigment print",
  "Acrylic and gold leaf",
  "Bogolan textile on stretcher",
  "Charcoal and ochre on paper",
  "Digital composite, AP 1/3",
];
const FIRST = ["Amara", "Kofi", "Zola", "Fatou", "Issa", "Niara", "Tariq", "Sade", "Mansa", "Asha", "Kwame", "Imani", "Jelani", "Naima", "Adisa", "Lerato"];
const LAST = ["Diop", "Okafor", "Mensah", "Adeyemi", "Mwangi", "Nkomo", "Cisse", "Bekele", "Touré", "Dlamini", "Sow", "Achebe", "Hassan", "Mutiso"];
const TITLES_LEFT = ["Ancestral", "Crimson", "Horizon", "Silent", "Threaded", "Echo of", "Songs from", "Mapping", "Rituals of", "After the"];
const TITLES_RIGHT = ["Thread", "Sahel", "Memory", "Pulse", "Geometry", "Diaspora", "Indigo", "Crossing", "Light", "Return"];

export type MockArtwork = {
  id: string;
  title: string;
  artist: string;
  artistSlug: string;
  year: number;
  technique: string;
  dimensions: string;
  price: number | null; // null = exhibition only
  city: string;
  description: string;
  swatch: string;
  room: 0 | 1 | 2;
  /** Real photo for a genuine artwork — omitted for mock/generated entries, which fall back to a placeholder. */
  image?: string;
};

export type MockArtist = {
  slug: string;
  name: string;
  role: "featured" | "emerging";
  bio: string;
  /** Real photo for a genuine artist — omitted for mock/generated entries, which fall back to a placeholder. */
  image?: string;
  avatarSwatch: string;
};

export type CountryGallery = {
  country: Country;
  artists: MockArtist[];
  artworks: MockArtwork[];
  rooms: { title: string; subtitle: string }[];
  available: number;
  hasNew: boolean;
};

export function getCountryGallery(slug: string): CountryGallery | null {
  const country = getCountryBySlug(slug);
  if (!country) return null;
  const r = rng(hash(slug));

  const featuredCount = 1;
  const emergingCount = 3 + Math.floor(r() * 3); // 3-5
  const artists: MockArtist[] = [];
  for (let i = 0; i < featuredCount + emergingCount; i++) {
    const name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`;
    artists.push({
      slug: name.toLowerCase().replace(/[^a-z]+/g, "-"),
      name,
      role: i === 0 ? "featured" : "emerging",
      bio: `${name.split(" ")[0]} works between ${country.capital} and the broader ${country.region} African scene.`,
      avatarSwatch: PALETTES[Math.floor(r() * PALETTES.length)],
    });
  }

  const workCount = 6 + Math.floor(r() * 7); // 6-12
  const artworks: MockArtwork[] = [];
  for (let i = 0; i < workCount; i++) {
    const artist = artists[Math.floor(r() * artists.length)];
    const w = 600 + Math.floor(r() * 600);
    const h = 700 + Math.floor(r() * 500);
    const room = (i % 3) as 0 | 1 | 2;
    const forSale = r() > 0.35;
    artworks.push({
      id: `${slug}-${i}`,
      title: `${TITLES_LEFT[Math.floor(r() * TITLES_LEFT.length)]} ${TITLES_RIGHT[Math.floor(r() * TITLES_RIGHT.length)]}`,
      artist: artist.name,
      artistSlug: artist.slug,
      year: 2018 + Math.floor(r() * 8),
      technique: TECHNIQUES[Math.floor(r() * TECHNIQUES.length)],
      dimensions: `${80 + Math.floor(r() * 120)} × ${60 + Math.floor(r() * 100)} cm`,
      price: forSale ? 1200 + Math.floor(r() * 18000) : null,
      city: country.capital,
      description: `A meditation on ${country.namePt.toLowerCase()}'s shifting cultural terrain — the work folds inherited symbology into a contemporary register.`,
      swatch: PALETTES[Math.floor(r() * PALETTES.length)],
      room,
    });
  }

  const rooms = [
    { title: "Featured Artist Room", subtitle: artists[0]?.name ?? "" },
    { title: "Emerging Artists Room", subtitle: `${emergingCount} voices from ${country.capital}` },
    { title: "Available Works Room", subtitle: "Acquire and support living artists" },
  ];

  return {
    country,
    artists,
    artworks,
    rooms,
    available: artworks.filter((a) => a.price !== null).length,
    hasNew: hash(slug) % 3 === 0,
  };
}

// ---------- Visited tracking (localStorage) ----------

const VISITED_KEY = "nuart:visited";

export function getVisited(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    return new Set(JSON.parse(localStorage.getItem(VISITED_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

export function markVisited(slug: string) {
  if (typeof window === "undefined") return;
  const set = getVisited();
  set.add(slug);
  localStorage.setItem(VISITED_KEY, JSON.stringify(Array.from(set)));
  window.dispatchEvent(new CustomEvent("nuart:visited-change"));
}
