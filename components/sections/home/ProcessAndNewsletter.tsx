const STEPS = [
  { n: "01", title: "Discover", body: "Browse our curated selection of emerging talent from across the continent, updated weekly." },
  { n: "02", title: "Save", body: "Follow your favorite artists and build a digital portfolio of works that resonate with you." },
  { n: "03", title: "Collect", body: "Inquire about original pieces. We handle authentication, logistics, and direct artist payment." },
  { n: "04", title: "Support", body: "Every acquisition directly funds the artist and fuels cultural sustainability initiatives." },
];

export function ProcessSteps() {
  return (
    <section className="py-section-gap px-gutter-page bg-surface-container-highest">
      <div className="max-w-container-max mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {STEPS.map((step) => (
            <div key={step.n} className="space-y-6">
              <div className="w-12 h-12 flex items-center justify-center bg-primary text-on-primary font-bold">
                {step.n}
              </div>
              <h3 className="font-headline-sm text-headline-sm">{step.title}</h3>
              <p className="text-on-surface-variant">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Newsletter() {
  return (
    <section className="py-section-gap px-gutter-page">
      <div className="max-w-3xl mx-auto text-center">
        <div className="mb-12">
          <div className="inline-block relative">
            <span className="font-label-caps text-secondary mb-4 block">BE THE FIRST</span>
            <div className="red-thread w-full bottom-0 left-0" />
          </div>
          <h2 className="font-headline-md text-headline-md mt-6">Receive new artists before the world sees them.</h2>
        </div>
        <form className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-grow w-full">
            <label htmlFor="newsletter-email" className="font-label-caps text-left block mb-2">
              EMAIL ADDRESS
            </label>
            <input
              id="newsletter-email"
              className="w-full bg-transparent border-0 border-b border-primary p-4 focus:ring-0 focus:border-secondary transition-all outline-none"
              placeholder="Your email address"
              type="email"
            />
          </div>
          <button className="bg-primary text-on-primary px-12 py-4 font-navigation text-navigation uppercase tracking-widest hover:bg-secondary transition-colors w-full md:w-auto">
            Subscribe
          </button>
        </form>
        <p className="text-xs text-on-surface-variant mt-6 uppercase tracking-widest">
          NO SPAM. JUST PURE ART DIRECT TO YOUR INBOX.
        </p>
      </div>
    </section>
  );
}
