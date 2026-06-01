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
  text: "#111827",
  muted: "#6b7280",
  faint: "#9ca3af",
  border: "#e5e7eb",
  rule: "#d1d5db",
  primary: "#15803d", // green-700 — readable on white (app's green accent)
  primaryDark: "#14532d",
  primarySoft: "#dcfce7",
  surface: "#f9fafb",
};

export const baseStyles = StyleSheet.create({
  page: {
    fontFamily: "FitMusc",
    fontSize: 10,
    color: PALETTE.text,
    paddingTop: 44,
    paddingBottom: 54,
    paddingHorizontal: 44,
    lineHeight: 1.45,
  },

  // ── Header ──────────────────────────────────────────────
  header: { marginBottom: 4 },
  brandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandWrap: { flexDirection: "row", alignItems: "center" },
  brandMark: {
    width: 15,
    height: 15,
    backgroundColor: PALETTE.primary,
    borderRadius: 4,
    marginRight: 7,
  },
  brand: { fontSize: 14, color: PALETTE.primary, fontWeight: 700, letterSpacing: 0.3 },
  metaRight: { alignItems: "flex-end" },
  metaText: { fontSize: 8, color: PALETTE.faint },
  docTitle: { fontSize: 20, marginTop: 16, fontWeight: 700, color: PALETTE.text },
  docSubtitle: { color: PALETTE.muted, marginTop: 3, fontSize: 10.5 },
  headerRule: {
    height: 2,
    backgroundColor: PALETTE.primary,
    marginTop: 12,
    borderRadius: 1,
  },

  // ── Sections ────────────────────────────────────────────
  sectionTitle: {
    fontSize: 12,
    marginTop: 16,
    marginBottom: 6,
    color: PALETTE.primaryDark,
    fontWeight: 700,
  },
  sectionLabel: {
    fontSize: 8,
    color: PALETTE.muted,
    marginBottom: 3,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  // Labeled bar that opens a sub-section (e.g. Meals / Workout within a day).
  // No element borders/radius here — these bars repeat down the page and can
  // sit on a page boundary, where react-pdf's border-clip path crashes. The
  // left accent is a filled child rect (safe background paint).
  subSection: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: PALETTE.surface,
    paddingVertical: 3,
    paddingHorizontal: 6,
    marginTop: 6,
    marginBottom: 4,
  },
  subSectionSpaced: { marginTop: 10 },
  subSectionBar: {
    width: 3,
    height: 9,
    backgroundColor: PALETTE.primary,
    marginRight: 6,
  },
  subSectionText: {
    fontSize: 8.5,
    fontWeight: 700,
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  muted: { color: PALETTE.muted },
  faint: { color: PALETTE.faint },
  bold: { fontWeight: 700 },
  row: { flexDirection: "row" },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.border,
    marginVertical: 14,
  },

  // ── Generic table primitives ────────────────────────────
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

  // ── Stat chips (kcal / macro summary cards) ─────────────
  chipRow: { flexDirection: "row", gap: 6, marginTop: 12, marginBottom: 2 },
  chip: {
    flex: 1,
    backgroundColor: PALETTE.surface,
    borderWidth: 1,
    borderColor: PALETTE.border,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 9,
  },
  chipAccent: {
    backgroundColor: PALETTE.primarySoft,
    borderColor: PALETTE.primary,
  },
  chipValue: { fontSize: 13, fontWeight: 700, color: PALETTE.text },
  chipLabel: {
    fontSize: 7.5,
    color: PALETTE.muted,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginTop: 1,
  },

  // ── Badge / pill ────────────────────────────────────────
  badge: {
    backgroundColor: PALETTE.primarySoft,
    color: PALETTE.primaryDark,
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // ── Footer ──────────────────────────────────────────────
  // A `fixed` footer repeats on every page, including ones whose content
  // overflowed; a top border there hits react-pdf's crashing border-clip
  // path, so the separator is a filled rect instead.
  footer: {
    position: "absolute",
    bottom: 22,
    left: 44,
    right: 44,
  },
  footerRule: { height: 1, backgroundColor: PALETTE.border, marginBottom: 5 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 8,
    color: PALETTE.faint,
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
    <View style={baseStyles.header}>
      <View style={baseStyles.brandRow}>
        <View style={baseStyles.brandWrap}>
          <View style={baseStyles.brandMark} />
          <Text style={baseStyles.brand}>{brand}</Text>
        </View>
        {metaLines && metaLines.length > 0 ? (
          <View style={baseStyles.metaRight}>
            {metaLines.map((line, i) => (
              <Text key={i} style={baseStyles.metaText}>
                {line}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
      <Text style={baseStyles.docTitle}>{title}</Text>
      {subtitle ? <Text style={baseStyles.docSubtitle}>{subtitle}</Text> : null}
      <View style={baseStyles.headerRule} />
    </View>
  );
}

export function DocFooter({ text }: { text: string }) {
  return (
    <View style={baseStyles.footer} fixed>
      <View style={baseStyles.footerRule} />
      <View style={baseStyles.footerRow}>
        <Text>{text}</Text>
        <Text
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </View>
    </View>
  );
}

export interface StatChip {
  label: string;
  value: string;
  accent?: boolean;
}

/** A row of evenly-sized summary cards (e.g. daily macro targets). */
export function StatChips({ chips }: { chips: StatChip[] }) {
  if (chips.length === 0) return null;
  return (
    <View style={baseStyles.chipRow}>
      {chips.map((c, i) => (
        <View
          key={i}
          style={c.accent ? [baseStyles.chip, baseStyles.chipAccent] : baseStyles.chip}
        >
          <Text style={baseStyles.chipValue}>{c.value}</Text>
          <Text style={baseStyles.chipLabel}>{c.label}</Text>
        </View>
      ))}
    </View>
  );
}

/** A labeled bar that introduces a sub-section inside a day/card. */
export function SubSection({ label, spaced }: { label: string; spaced?: boolean }) {
  return (
    <View
      wrap={false}
      style={spaced ? [baseStyles.subSection, baseStyles.subSectionSpaced] : baseStyles.subSection}
    >
      <View style={baseStyles.subSectionBar} />
      <Text style={baseStyles.subSectionText}>{label}</Text>
    </View>
  );
}

// Re-export the primitives so document modules import everything from one place.
export { Document, Page, View, Text, StyleSheet };
