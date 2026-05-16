import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "FitMusc — AI Destekli Kişisel Fitness Takip";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand wordmark: stacked "FIT" / "MUSC" in Barlow Condensed Black Italic,
// matching the app icon design pack (FIT #fafaf9, MUSC #22c55e on #0a0a0a).
export default async function OgImage() {
  const barlow = await fetch(
    new URL("./BarlowCondensed-BlackItalic.ttf", import.meta.url),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #0a0a0a 0%, #18181b 50%, #0a0a0a 100%)",
          fontFamily: "Barlow Condensed",
          fontWeight: 900,
          fontStyle: "italic",
        }}
      >
        {/* Top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            background:
              "linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #22c55e 100%)",
          }}
        />

        {/* Stacked wordmark */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            lineHeight: 0.86,
            letterSpacing: "-0.02em",
          }}
        >
          <div style={{ display: "flex", fontSize: 200, color: "#fafaf9" }}>
            FIT
          </div>
          <div style={{ display: "flex", fontSize: 200, color: "#22c55e" }}>
            MUSC
          </div>
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#a1a1aa",
            marginTop: 36,
            letterSpacing: "0.04em",
          }}
        >
          AI DESTEKLİ KİŞİSEL FİTNESS TAKİP
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 12, marginTop: 44 }}>
          {["Antrenman", "Beslenme", "AI Koç", "İlerleme"].map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                padding: "8px 22px",
                borderRadius: 50,
                border: "1px solid rgba(34, 197, 94, 0.35)",
                background: "rgba(34, 197, 94, 0.08)",
                color: "#22c55e",
                fontSize: 20,
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 36,
            display: "flex",
            fontSize: 20,
            color: "#52525b",
            letterSpacing: "0.06em",
          }}
        >
          fitmusc.com
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Barlow Condensed",
          data: barlow,
          weight: 900,
          style: "italic",
        },
      ],
    },
  );
}
