import { ImageResponse } from "next/og";

export const alt = "NUA-ARTE — Contemporary African Art";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default share image for every page that doesn't set its own. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#161616",
          color: "#F0F0EE",
          borderTop: "12px solid #D7141E",
        }}
      >
        <div style={{ fontSize: 28, letterSpacing: 8, color: "#FF4D57", marginBottom: 28 }}>NUA-ARTE</div>
        <div style={{ fontSize: 84, lineHeight: 1.05, fontFamily: "serif" }}>Contemporary African Art</div>
        <div style={{ fontSize: 30, marginTop: 32, color: "#B8B8B8" }}>
          Original works, collected with intent · New York · Luanda
        </div>
      </div>
    ),
    size,
  );
}
