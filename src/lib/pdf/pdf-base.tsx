import { Document, Page, View, Text, StyleSheet, Font } from "@react-pdf/renderer";
import path from "node:path";

// Shared Turkish-capable font for every app export PDF. The bundled Geist
// Regular at public/fonts covers the glyphs (ş, ğ, ı, İ …) the built-in PDF
// fonts lack. Registered under its own family so it never clashes with the
// billing receipt's "Receipt" registration.
Font.register({
  family: "FitMusc",
  src: path.join(process.cwd(), "public", "fonts", "receipt.ttf"),
});

// react-pdf hyphenates long words by default; disable so Turkish content and
// food names stay intact.
Font.registerHyphenationCallback((word) => [word]);

export const PALETTE = {
  text: "#1a1a1a",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#e5e7eb",
  primary: "#15803d", // green-700 — readable on white (app's green accent)
  primarySoft: "#dcfce7",
};

export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: "FitMusc",
    fontSize: 10,
    color: PALETTE.text,
    padding: 40,
    lineHeight: 1.4,
  },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: { fontSize: 14, color: PALETTE.primary },
  docTitle: { fontSize: 20, marginTop: 8 },
  docSubtitle: { color: PALETTE.muted, marginTop: 2 },
  metaRight: { textAlign: "right", color: PALETTE.muted },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 12,
    marginTop: 14,
    marginBottom: 6,
    color: PALETTE.primary,
  },
  sectionLabel: {
    fontSize: 8,
    color: PALETTE.muted,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  muted: { color: PALETTE.muted },
  faint: { color: PALETTE.faint },
  bold: { fontWeight: 700 },
  row: { flexDirection: "row" },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    paddingBottom: 4,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: PALETTE.border,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: PALETTE.faint,
    textAlign: "center",
  },
});

export interface DocHeaderProps {
  brand: string;
  title: string;
  subtitle?: string;
  metaLines?: string[];
}

export function DocHeader({ brand, title, subtitle, metaLines }: DocHeaderProps) {
  return (
    <View>
      <View style={baseStyles.brandRow}>
        <Text style={baseStyles.brand}>{brand}</Text>
        {metaLines && metaLines.length > 0 ? (
          <View style={baseStyles.metaRight}>
            {metaLines.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
          </View>
        ) : null}
      </View>
      <Text style={baseStyles.docTitle}>{title}</Text>
      {subtitle ? <Text style={baseStyles.docSubtitle}>{subtitle}</Text> : null}
      <View style={baseStyles.divider} />
    </View>
  );
}

export function DocFooter({ text }: { text: string }) {
  return (
    <Text style={baseStyles.footer} fixed>
      {text}
    </Text>
  );
}

// Re-export the primitives so document modules import everything from one place.
export { Document, Page, View, Text, StyleSheet };
