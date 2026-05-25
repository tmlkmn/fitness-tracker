import {
  Document,
  Page,
  View,
  Text,
  baseStyles,
  PALETTE,
  DocHeader,
  DocFooter,
} from "../pdf-base";
import { StyleSheet } from "@react-pdf/renderer";
import type { ExportLabels } from "../blocks";
import { stripEmoji } from "@/lib/icon-map";

const styles = StyleSheet.create({
  catTitle: {
    fontSize: 11,
    color: PALETTE.primary,
    marginTop: 12,
    marginBottom: 3,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    borderBottomWidth: 0.5,
    borderBottomColor: PALETTE.border,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: PALETTE.muted,
    borderRadius: 2,
    marginRight: 8,
  },
  checkboxDone: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: PALETTE.primary,
    backgroundColor: PALETTE.primary,
    borderRadius: 2,
    marginRight: 8,
  },
  itemName: { flex: 1 },
  itemNameDone: { flex: 1, color: PALETTE.faint, textDecoration: "line-through" },
  itemQty: { width: 120, textAlign: "right", color: PALETTE.muted },
});

export interface ShoppingItemData {
  id: number;
  category: string;
  itemName: string;
  quantity: string;
  notes: string | null;
  isPurchased: boolean | null;
}

export interface ShoppingListDocData {
  items: ShoppingItemData[];
  weekLabel: string;
  labels: ExportLabels;
  generatedAt: string;
  progressLine: string;
}

export function ShoppingListDocument({ data }: { data: ShoppingListDocData }) {
  const { items, weekLabel, labels: L, generatedAt, progressLine } = data;

  const groups: { category: string; items: ShoppingItemData[] }[] = [];
  for (const item of items) {
    let group = groups.find((g) => g.category === item.category);
    if (!group) {
      group = { category: item.category, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }

  return (
    <Document>
      <Page size="A4" style={baseStyles.page}>
        <DocHeader
          brand={L.brand}
          title={L.shoppingTitle}
          subtitle={`${weekLabel} · ${progressLine}`}
          metaLines={[`${L.generatedAt}: ${generatedAt}`]}
        />

        {groups.map((g, gi) => (
          <View key={gi} wrap={false}>
            <Text style={styles.catTitle}>{stripEmoji(g.category)}</Text>
            {g.items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View
                  style={item.isPurchased ? styles.checkboxDone : styles.checkbox}
                />
                <Text
                  style={item.isPurchased ? styles.itemNameDone : styles.itemName}
                >
                  {item.itemName}
                  {item.notes ? `  (${item.notes})` : ""}
                </Text>
                <Text style={styles.itemQty}>{item.quantity}</Text>
              </View>
            ))}
          </View>
        ))}

        <DocFooter text={L.footer} />
      </Page>
    </Document>
  );
}
