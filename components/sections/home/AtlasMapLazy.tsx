"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { AtlasStats } from "./AtlasMap";
import "@/components/map/clay-atlas.css";

// The clay map is ~1.2 MB of SVG plus d3-geo and the Africa GeoJSON, and it
// sits well below the fold. Rendering it in the server HTML and hydrating it
// on load was the page's biggest long task, so it is now loaded only as the
// visitor scrolls towards it (well before it reaches the screen).
const AfricaMapSection = dynamic(() => import("./AtlasMap").then((m) => m.AfricaMapSection), {
  ssr: false,
  loading: () => <Placeholder />,
});

/** Same id, background and approximate height as the real section, so
 * "/#atlas" links land in the right place and nothing jumps on screen. */
function Placeholder({ innerRef }: { innerRef?: React.Ref<HTMLElement> }) {
  return (
    <section
      ref={innerRef}
      id="atlas"
      aria-hidden="true"
      className="nu-atlas relative w-screen mx-[calc(50%-50vw)] min-h-[2130px] md:min-h-[2290px] lg:min-h-[1068px]"
      style={{ backgroundColor: "var(--atlas-bg)" }}
    />
  );
}

export function AfricaMapSectionLazy({ stats }: { stats: AtlasStats }) {
  const ref = useRef<HTMLElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Also covers arriving via "/#atlas": the browser scrolls to this
    // placeholder, which then intersects straight away.
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin: "1200px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return show ? <AfricaMapSection stats={stats} /> : <Placeholder innerRef={ref} />;
}
