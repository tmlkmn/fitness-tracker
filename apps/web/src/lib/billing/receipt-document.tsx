import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import path from "node:path";

// Geist Regular, bundled at public/fonts — covers the Turkish glyphs
// (ş, ğ, ı, İ …) that the built-in PDF fonts lack.
Font.register({
  family: "Receipt",
  src: path.join(process.cwd(), "public", "fonts", "receipt.ttf"),
});

export interface ReceiptLabels {
  title: string;
  receiptNo: string;
  date: string;
  billedTo: string;
  item: string;
  taxNo: string;
  subtotal: string;
  tax: string;
  total: string;
  paidVia: string;
  footer: string;
}

export interface ReceiptData {
  receiptNo: string;
  issuedAt: string;
  customerName: string;
  customerEmail: string;
  providerLabel: string;
  itemName: string;
  amount: string;
  subtotal: string;
  tax: string;
  currency: string;
  company: { name: string; address: string; taxId: string };
  labels: ReceiptLabels;
}

const styles = StyleSheet.create({
  page: {
    fontFamily: "Receipt",
    fontSize: 10,
    color: "#1a1a1a",
    padding: 48,
    lineHeight: 1.5,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  company: { maxWidth: 280 },
  companyName: { fontSize: 16, marginBottom: 4 },
  muted: { color: "#6b7280" },
  meta: { textAlign: "right" },
  metaTitle: { fontSize: 20, marginBottom: 6 },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    marginVertical: 20,
  },
  sectionLabel: {
    fontSize: 8,
    color: "#6b7280",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 6,
    marginTop: 20,
    marginBottom: 6,
  },
  row: { flexDirection: "row", paddingVertical: 4 },
  colDesc: { flex: 1 },
  colAmount: { width: 130, textAlign: "right" },
  totals: { marginTop: 16, marginLeft: "auto", width: 220 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  grandRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    fontSize: 13,
  },
  footer: {
    marginTop: 48,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
  },
});

export function ReceiptDocument({ data }: { data: ReceiptData }) {
  const { labels: L, company } = data;
  const money = (value: string) => `${value} ${data.currency}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.company}>
            <Text style={styles.companyName}>{company.name || "FitMusc"}</Text>
            {company.address ? (
              <Text style={styles.muted}>{company.address}</Text>
            ) : null}
            {company.taxId ? (
              <Text style={styles.muted}>
                {L.taxNo}: {company.taxId}
              </Text>
            ) : null}
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaTitle}>{L.title}</Text>
            <Text style={styles.muted}>
              {L.receiptNo}: {data.receiptNo}
            </Text>
            <Text style={styles.muted}>
              {L.date}: {data.issuedAt}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View>
          <Text style={styles.sectionLabel}>{L.billedTo}</Text>
          <Text>{data.customerName}</Text>
          <Text style={styles.muted}>{data.customerEmail}</Text>
        </View>

        <View style={styles.tableHeader}>
          <Text style={styles.colDesc}>{L.item}</Text>
          <Text style={styles.colAmount}>{L.subtotal}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.colDesc}>{data.itemName}</Text>
          <Text style={styles.colAmount}>{money(data.subtotal)}</Text>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>{L.subtotal}</Text>
            <Text>{money(data.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.muted}>{L.tax}</Text>
            <Text>{money(data.tax)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text>{L.total}</Text>
            <Text>{money(data.amount)}</Text>
          </View>
        </View>

        <Text style={[styles.muted, { marginTop: 24 }]}>
          {L.paidVia}: {data.providerLabel}
        </Text>

        <Text style={styles.footer}>{L.footer}</Text>
      </Page>
    </Document>
  );
}
