import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Country Spotlight | NU-ART",
  description: "NU-ART — contemporary African art movement.",
};

type Props = { params: Promise<{ country: string }> };

/**
 * NOTE: ported as-is from the original — a fixed Nigeria showcase template
 * (spotlight carousel markup is static; the slideshow JS wasn't in the
 * source route either). Not the primary country page — see
 * /discover/[country] for the fully data-driven version covering all 54
 * countries. Kept for parity since it's a distinct route in the original site.
 */
export default async function Page({ params }: Props) {
  await params;
  return (
    <main>
      <section className="px-gutter-page pt-24 pb-12 max-w-container-max mx-auto relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
      <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
      <span className="material-symbols-outlined text-secondary text-4xl" data-icon="flag">flag</span>
      <div className="w-12 h-[1px] bg-secondary"></div>
      <a className="font-navigation text-navigation uppercase tracking-widest flex items-center gap-2 hover:text-secondary transition-colors" href="#">
      <span className="material-symbols-outlined text-sm" data-icon="arrow_back">arrow_back</span> Back to Map
                              </a>
      </div>
      <h1 className="font-display-lg text-display-lg mb-4">Nigeria</h1>
      <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                              The heartbeat of African contemporary art. From the bustling energy of Lagos to the historical depth of Benin City, Nigerian artists are redefining global narratives through bold experimentation in sculpture, photography, and conceptual installations.
                          </p>
      </div>
      <div className="flex flex-col gap-2 text-right">
      <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">Active Artists</span>
      <span className="font-headline-sm text-headline-sm">1,240+</span>
      </div>
      </div>
      <div className="absolute left-margin-desktop bottom-0 h-32 red-thread-v hidden md:block"></div>
      </section>
      <section className="relative h-[819px] overflow-hidden" id="spotlight">
      <div className="relative w-full h-full" id="spotlight-container">
      <div className="spotlight-slide absolute inset-0 opacity-100 transition-opacity duration-1000 z-10" style={{"opacity": "1", "zIndex": "10"}}>
      <div className="absolute inset-0 bg-black/40 z-10"></div>
      <img className="w-full h-full object-cover" alt="A powerful large-scale portrait of a Nigerian artist in a sun-drenched Lagos studio, surrounded by vibrant abstract paintings with rich ochre and deep indigo tones. The lighting is dramatic and cinematic, emphasizing the texture of the canvases. Minimalist gallery aesthetic with high-contrast shadows and clean lines." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/8170e7d1-3e87-4dfd-984d-5c50a5625187/afr-gallery-room.jpg" />
      <div className="absolute bottom-0 left-0 w-full p-margin-desktop z-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="text-beige max-w-xl">
      <span className="font-label-caps text-label-caps bg-secondary px-3 py-1 mb-4 inline-block uppercase">Artist Spotlight</span>
      <h2 className="font-display-lg text-display-lg mb-2">Zubairu Ibrahim</h2>
      <p className="font-body-lg text-body-lg opacity-90 mb-6">Exploring the intersection of Yoruba mythology and digital fragmentation through large-scale mixed media.</p>
      <button className="border border-beige text-beige px-8 py-3 font-navigation text-navigation uppercase tracking-widest hover:bg-beige hover:text-primary transition-all">Explore Works</button>
      </div>
      <div className="text-beige text-right hidden md:block">
      <span className="font-label-caps text-label-caps block opacity-60 uppercase mb-2">Current Residence</span>
      <span className="font-body-lg text-body-lg italic">Lagos, Nigeria</span>
      </div>
      </div>
      </div>
      <div className="spotlight-slide absolute inset-0 opacity-0 transition-opacity duration-1000" style={{"opacity": "0", "zIndex": "0"}}>
      <div className="absolute inset-0 bg-black/40 z-10"></div>
      <img className="w-full h-full object-cover" alt="Contemporary sculpture made of recycled metal and woven textiles, displayed in a high-end minimalist gallery in Abuja. The sculpture is intricate and reflects light with metallic glints against a soft off-white background. The mood is sophisticated and authoritative, highlighting the craftsmanship of Nigerian industrial art." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/8fb36909-f581-4701-9e44-3a179fcb76d5/afr-ceramic.jpg" />
      <div className="absolute bottom-0 left-0 w-full p-margin-desktop z-20 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="text-beige max-w-xl">
      <span className="font-label-caps text-label-caps bg-secondary px-3 py-1 mb-4 inline-block uppercase">Artist Spotlight</span>
      <h2 className="font-display-lg text-display-lg mb-2">Amara Okeke</h2>
      <p className="font-body-lg text-body-lg opacity-90 mb-6">Transforming industrial waste into ethereal sculptures that challenge perceptions of permanence.</p>
      <button className="border border-beige text-beige px-8 py-3 font-navigation text-navigation uppercase tracking-widest hover:bg-beige hover:text-primary transition-all">Explore Works</button>
      </div>
      <div className="text-beige text-right hidden md:block">
      <span className="font-label-caps text-label-caps block opacity-60 uppercase mb-2">Current Residence</span>
      <span className="font-body-lg text-body-lg italic">Abuja, Nigeria</span>
      </div>
      </div>
      </div>
      </div>
      <div className="absolute bottom-0 left-0 h-1 bg-secondary z-30 transition-all duration-5000 ease-linear" id="spotlight-progress" style={{"width": "100%", "transition": "width 5000ms linear"}}></div>
      </section>
      <section className="bg-surface-container-low border-b border-primary/5 sticky top-[88px] z-40">
      <div className="px-gutter-page py-6 max-w-container-max mx-auto flex flex-wrap items-center justify-between gap-6">
      <div className="flex flex-wrap items-center gap-8">
      <div className="group cursor-pointer">
      <span className="font-label-caps text-label-caps text-on-surface-variant block uppercase mb-1">City</span>
      <div className="flex items-center gap-2 border-b border-primary/20 pb-1 group-hover:border-primary transition-colors">
      <span className="font-navigation text-navigation">All Cities</span>
      <span className="material-symbols-outlined text-sm" data-icon="expand_more">expand_more</span>
      </div>
      </div>
      <div className="group cursor-pointer">
      <span className="font-label-caps text-label-caps text-on-surface-variant block uppercase mb-1">Medium</span>
      <div className="flex items-center gap-2 border-b border-primary/20 pb-1 group-hover:border-primary transition-colors">
      <span className="font-navigation text-navigation">Mixed Media</span>
      <span className="material-symbols-outlined text-sm" data-icon="expand_more">expand_more</span>
      </div>
      </div>
      <div className="group cursor-pointer">
      <span className="font-label-caps text-label-caps text-on-surface-variant block uppercase mb-1">Availability</span>
      <div className="flex items-center gap-2 border-b border-primary/20 pb-1 group-hover:border-primary transition-colors">
      <span className="font-navigation text-navigation">Available Pieces</span>
      <span className="material-symbols-outlined text-sm" data-icon="expand_more">expand_more</span>
      </div>
      </div>
      </div>
      <div className="font-navigation text-navigation uppercase tracking-widest text-on-surface-variant">
                          Displaying <span className="text-primary font-bold">48</span> Results
                      </div>
      </div>
      </section>
      <section className="px-gutter-page py-section-gap max-w-container-max mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-24">
      <div className="group cursor-pointer">
      <div className="relative overflow-hidden aspect-[3/4] mb-8">
      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="A striking portrait of a contemporary Nigerian artist with a serious gaze, shot against a deep red minimalist wall. The lighting is soft but directed, highlighting the artist's features. The aesthetic is clean, premium, and reminiscent of a high-end fashion or art editorial. No shadows, just pure color contrast." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/04f8502e-a9bb-4275-9ace-a1f2f752eae2/afr-mixedmedia.jpg" />
      <div className="absolute top-6 left-6 flex flex-col gap-2">
      <span className="bg-primary text-beige font-label-caps text-[10px] px-3 py-1 uppercase tracking-widest">New Discovery</span>
      </div>
      <div className="absolute bottom-6 right-6">
      <div className="w-12 h-12 bg-beige flex items-center justify-center translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
      <span className="material-symbols-outlined text-primary" data-icon="arrow_forward">arrow_forward</span>
      </div>
      </div>
      </div>
      <div className="relative">
      <div className="absolute -top-4 left-0 w-8 h-[1px] red-thread"></div>
      <span className="font-label-caps text-label-caps text-secondary uppercase block mb-1">Photographer</span>
      <h3 className="font-headline-sm text-headline-sm mb-1 group-hover:text-secondary transition-colors">Femi Adebayo</h3>
      <p className="font-body-md text-body-md text-on-surface-variant italic">Lagos, Nigeria</p>
      </div>
      </div>
      <div className="group cursor-pointer md:mt-24">
      <div className="relative overflow-hidden aspect-[3/4] mb-8">
      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="A modern Nigerian artist painting a large canvas in a warehouse-style studio. The painting features vibrant geometric patterns in green, white, and black. High-key lighting fills the space, creating a clean and airy digital gallery feel. Focus is on the artist's hand holding a brush, conveying a sense of craftsmanship and intent." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/53f7015e-08e4-4a34-b1a9-68d47a7f1a78/afr-sculpture.jpg" />
      <div className="absolute bottom-6 right-6">
      <div className="w-12 h-12 bg-beige flex items-center justify-center translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
      <span className="material-symbols-outlined text-primary" data-icon="arrow_forward">arrow_forward</span>
      </div>
      </div>
      </div>
      <div className="relative">
      <div className="absolute -top-4 left-0 w-8 h-[1px] red-thread"></div>
      <span className="font-label-caps text-label-caps text-secondary uppercase block mb-1">Painter</span>
      <h3 className="font-headline-sm text-headline-sm mb-1 group-hover:text-secondary transition-colors">Chinwe Eze</h3>
      <p className="font-body-md text-body-md text-on-surface-variant italic">Enugu, Nigeria</p>
      </div>
      </div>
      <div className="group cursor-pointer">
      <div className="relative overflow-hidden aspect-[3/4] mb-8 border border-primary/5">
      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Close-up of a textile artist weaving traditional Nigerian patterns into a modern tapestry. The colors are rich indigos and burnt oranges. The lighting is intimate and warm, focusing on the texture of the threads. The overall style is editorial and human-centric, emphasizing the tactile nature of the work." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/962ca422-ea96-4526-86bf-114414bf21e6/afr-culture-portrait.jpg" />
      <div className="absolute top-6 left-6 flex flex-col gap-2">
      <span className="bg-primary text-beige font-label-caps text-[10px] px-3 py-1 uppercase tracking-widest">New Discovery</span>
      </div>
      <div className="absolute bottom-6 right-6">
      <div className="w-12 h-12 bg-beige flex items-center justify-center translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
      <span className="material-symbols-outlined text-primary" data-icon="arrow_forward">arrow_forward</span>
      </div>
      </div>
      </div>
      <div className="relative">
      <div className="absolute -top-4 left-0 w-8 h-[1px] red-thread"></div>
      <span className="font-label-caps text-label-caps text-secondary uppercase block mb-1">Textile Artist</span>
      <h3 className="font-headline-sm text-headline-sm mb-1 group-hover:text-secondary transition-colors">Tunde Bakare</h3>
      <p className="font-body-md text-body-md text-on-surface-variant italic">Abeokuta, Nigeria</p>
      </div>
      </div>
      <div className="group cursor-pointer">
      <div className="relative overflow-hidden aspect-[3/4] mb-8">
      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="A conceptual Nigerian sculptor standing next to a massive bronze work in a garden setting. The sculpture has smooth, flowing lines that catch the afternoon sun. The lighting is warm and golden, creating a sophisticated outdoor gallery vibe. The artist's presence is quiet and authoritative, perfectly integrated with the artwork." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/047a8f56-5cc6-48eb-8d6b-4c1254b37d70/afr-ritual-bw.jpg" />
      <div className="absolute bottom-6 right-6">
      <div className="w-12 h-12 bg-beige flex items-center justify-center translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
      <span className="material-symbols-outlined text-primary" data-icon="arrow_forward">arrow_forward</span>
      </div>
      </div>
      </div>
      <div className="relative">
      <div className="absolute -top-4 left-0 w-8 h-[1px] red-thread"></div>
      <span className="font-label-caps text-label-caps text-secondary uppercase block mb-1">Sculptor</span>
      <h3 className="font-headline-sm text-headline-sm mb-1 group-hover:text-secondary transition-colors">Obinna Okoro</h3>
      <p className="font-body-md text-body-md text-on-surface-variant italic">Benin City, Nigeria</p>
      </div>
      </div>
      <div className="group cursor-pointer md:mt-24">
      <div className="relative overflow-hidden aspect-[3/4] mb-8">
      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="A portrait of a young digital artist in a high-tech studio environment in Lagos. Glowing screens reflect colors on their face. The aesthetic is futuristic yet minimalist, with clean lines and high-contrast lighting. The mood is innovative and forward-looking, showcasing the new wave of Nigerian digital creativity." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/dc981581-67cc-4c92-881e-bbb825d6b9c6/afr-street-lagos.jpg" />
      <div className="absolute top-6 left-6 flex flex-col gap-2">
      <span className="bg-primary text-beige font-label-caps text-[10px] px-3 py-1 uppercase tracking-widest">New Discovery</span>
      </div>
      <div className="absolute bottom-6 right-6">
      <div className="w-12 h-12 bg-beige flex items-center justify-center translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
      <span className="material-symbols-outlined text-primary" data-icon="arrow_forward">arrow_forward</span>
      </div>
      </div>
      </div>
      <div className="relative">
      <div className="absolute -top-4 left-0 w-8 h-[1px] red-thread"></div>
      <span className="font-label-caps text-label-caps text-secondary uppercase block mb-1">Digital Media</span>
      <h3 className="font-headline-sm text-headline-sm mb-1 group-hover:text-secondary transition-colors">Seyi Johnson</h3>
      <p className="font-body-md text-body-md text-on-surface-variant italic">Lagos, Nigeria</p>
      </div>
      </div>
      <div className="group cursor-pointer">
      <div className="relative overflow-hidden aspect-[3/4] mb-8 border border-primary/5">
      <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="An artist's studio floor covered in charcoal drawings and sketches of urban Lagos life. The viewpoint is from above, creating a graphic and textured composition. The lighting is natural and soft, emphasizing the raw materials and the creative process. The mood is authentic and humanized, revealing the work behind the art." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/962ca422-ea96-4526-86bf-114414bf21e6/afr-culture-portrait.jpg" />
      <div className="absolute bottom-6 right-6">
      <div className="w-12 h-12 bg-beige flex items-center justify-center translate-y-20 group-hover:translate-y-0 transition-transform duration-500">
      <span className="material-symbols-outlined text-primary" data-icon="arrow_forward">arrow_forward</span>
      </div>
      </div>
      </div>
      <div className="relative">
      <div className="absolute -top-4 left-0 w-8 h-[1px] red-thread"></div>
      <span className="font-label-caps text-label-caps text-secondary uppercase block mb-1">Charcoal Artist</span>
      <h3 className="font-headline-sm text-headline-sm mb-1 group-hover:text-secondary transition-colors">Ifeoma Nwosu</h3>
      <p className="font-body-md text-body-md text-on-surface-variant italic">Port Harcourt, Nigeria</p>
      </div>
      </div>
      </div>
      <div className="mt-24 flex justify-center">
      <button className="bg-primary text-on-primary px-12 py-4 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary transition-all">Load More Artists</button>
      </div>
      </section>
      <section className="bg-primary text-beige py-section-gap overflow-hidden">
      <div className="px-gutter-page max-w-container-max mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
      <div>
      <span className="font-label-caps text-label-caps text-secondary-fixed-dim block uppercase mb-4 tracking-[0.3em]">Curated Selections</span>
      <h2 className="font-display-lg text-display-lg leading-none">Country Collections</h2>
      </div>
      <div className="max-w-md">
      <p className="font-body-lg text-body-lg opacity-70 mb-6">Expertly curated bodies of work representing the specific aesthetic movements emerging from Nigeria today.</p>
      <a className="font-navigation text-navigation uppercase tracking-widest border-b border-beige hover:text-secondary transition-colors inline-block pb-1" href="#">View All Collections</a>
      </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="group cursor-pointer">
      <div className="relative aspect-[16/9] mb-8 overflow-hidden">
      <img className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" alt="A curated collection of minimalist Nigerian artworks displayed in a high-end digital gallery setting. The works are mostly black and white with subtle red accents. The lighting is cool and professional. The overall aesthetic is one of precision, sophistication, and global appeal, focusing on the narrative of modern Nigeria." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/3b671063-daed-4dec-a143-5219ad0ec512/afr-fabric-macro.jpg" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
      </div>
      <h3 className="font-headline-sm text-headline-sm mb-2">The Eko Narrative</h3>
      <p className="font-body-md text-body-md opacity-60 mb-6">A study of urban density and spiritual stillness in the megacity of Lagos.</p>
      <div className="flex items-center gap-4">
      <span className="font-label-caps text-label-caps uppercase border border-beige/20 px-3 py-1">14 Works</span>
      <span className="font-label-caps text-label-caps uppercase border border-beige/20 px-3 py-1">Photography</span>
      </div>
      </div>
      <div className="group cursor-pointer">
      <div className="relative aspect-[16/9] mb-8 overflow-hidden">
      <img className="w-full h-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" alt="A collection of vibrant, abstract paintings by Nigerian artists, arranged on a paper-tinted background. The colors are bold and expressive, featuring rich yellows, deep reds, and forest greens. The lighting is bright and even, highlighting the textural quality of the paint. The atmosphere is energetic and celebratory." src="https://nu-artcollective.lovable.app/__l5e/assets-v1/7ecf1ef0-f8b8-4e2b-ba7f-9abe7ac43151/afr-portrait-painting.jpg" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
      </div>
      <h3 className="font-headline-sm text-headline-sm mb-2">Ancestral Echoes</h3>
      <p className="font-body-md text-body-md opacity-60 mb-6">Contemporary reinterpretations of pre-colonial Benin and Ife motifs.</p>
      <div className="flex items-center gap-4">
      <span className="font-label-caps text-label-caps uppercase border border-beige/20 px-3 py-1">22 Works</span>
      <span className="font-label-caps text-label-caps uppercase border border-beige/20 px-3 py-1">Mixed Media</span>
      </div>
      </div>
      </div>
      </div>
      </section>
      <section className="px-gutter-page py-section-gap max-w-container-max mx-auto text-center">
      <div className="max-w-2xl mx-auto">
      <span className="material-symbols-outlined text-secondary text-5xl mb-8" data-icon="auto_awesome">auto_awesome</span>
      <h2 className="font-headline-md text-headline-md mb-6">Never miss a masterpiece from the continent.</h2>
      <p className="font-body-lg text-body-lg text-on-surface-variant mb-12">Join the NU-ART Circle to receive exclusive first-looks at new Nigerian drops and invitations to private artist talks.</p>
      <div className="flex flex-col md:flex-row gap-4 justify-center items-stretch max-w-lg mx-auto">
      <input className="flex-grow border-b border-primary py-4 px-2 font-body-md focus:outline-none focus:border-secondary bg-transparent" placeholder="Your Email Address" type="email" />
      <button className="bg-primary text-on-primary px-8 py-4 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary transition-all">Join The Circle</button>
      </div>
      <div className="mt-12 relative flex justify-center">
      <div className="absolute -top-6">
      <svg fill="none" height="80" viewBox="0 0 240 80" width="240" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 40C5 15 50 5 120 5C190 5 235 15 235 40C235 65 190 75 120 75C50 75 5 65 5 40Z" stroke="var(--red-blood)" strokeDasharray="1000" strokeDashoffset="1000" strokeWidth="2">
      <animate attributeName="stroke-dashoffset" dur="2s" fill="freeze" from="1000" to="0"></animate>
      </path>
      </svg>
      </div>
      <p className="font-label-caps text-label-caps text-secondary uppercase tracking-[0.2em] relative z-10 py-2 px-8">Inquire About Nigeria Collections</p>
      </div>
      </div>
      </section>
    </main>
  );
}
