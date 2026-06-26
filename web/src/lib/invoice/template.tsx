import "server-only";
import path from "node:path";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { InvoiceData } from "./data";

// Embed a Unicode font so Romanian diacritics (ă â î ș ț) render — the PDF standard
// fonts only cover Latin-1. Paths resolve from the project root (cwd = web/).
const FONT_DIR = path.join(process.cwd(), "src/lib/invoice/fonts");
Font.register({
  family: "Noto",
  fonts: [
    { src: path.join(FONT_DIR, "NotoSans-Regular.ttf") },
    { src: path.join(FONT_DIR, "NotoSans-Bold.ttf"), fontWeight: "bold" },
  ],
});
// Don't hyphenate words across lines.
Font.registerHyphenationCallback((word) => [word]);

const BRAND = "#e77023";
const INK = "#1e2d37";
const MUTED = "#5e6e7a";
const BORDER = "#dadbdc";

const s = StyleSheet.create({
  page: {
    fontFamily: "Noto",
    fontSize: 10,
    color: INK,
    paddingHorizontal: 44,
    paddingVertical: 40,
    lineHeight: 1.4,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontSize: 22, fontWeight: "bold", color: BRAND, lineHeight: 1 },
  docKind: { fontSize: 11, color: MUTED, marginTop: 5 },
  headRight: { alignItems: "flex-end" },
  orderNo: { fontSize: 13, fontWeight: "bold" },
  metaMuted: { fontSize: 9, color: MUTED },
  rule: { borderBottomWidth: 1, borderBottomColor: BORDER, marginVertical: 16 },
  parties: { flexDirection: "row", justifyContent: "space-between", gap: 24 },
  party: { flex: 1 },
  partyLabel: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 },
  partyName: { fontSize: 11, fontWeight: "bold" },
  partyLine: { fontSize: 9, color: MUTED },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f0f1f1",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 22,
  },
  th: { fontSize: 8, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: "bold" },
  row: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  colName: { flex: 1, paddingRight: 8 },
  colQty: { width: 44, textAlign: "center" },
  colTotal: { width: 80, textAlign: "right" },
  itemTitle: { fontSize: 10, fontWeight: "bold" },
  itemSummary: { fontSize: 8.5, color: MUTED, marginTop: 1 },
  totals: { marginTop: 16, alignItems: "flex-end" },
  totalRow: { flexDirection: "row", width: 240, justifyContent: "space-between", paddingVertical: 2 },
  totalLabel: { fontSize: 10, color: MUTED },
  totalValue: { fontSize: 10 },
  grandRow: {
    flexDirection: "row",
    width: 240,
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: INK,
  },
  grandLabel: { fontSize: 12, fontWeight: "bold" },
  grandValue: { fontSize: 12, fontWeight: "bold", color: BRAND },
  offerNote: { fontSize: 8, color: BRAND, width: 240, textAlign: "right" },
  payBox: {
    marginTop: 22,
    padding: 10,
    backgroundColor: "#fdf4ed",
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 44,
    right: 44,
    textAlign: "center",
    fontSize: 8,
    color: MUTED,
  },
});

const lei = (n: number) => `${n.toFixed(2)} RON`;

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  return (
    <Document title={`Chitanță ${data.orderShortId}`} author="Sprintr">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>Sprintr</Text>
            <Text style={s.docKind}>Chitanță comandă</Text>
          </View>
          <View style={s.headRight}>
            <Text style={s.orderNo}>#{data.orderShortId}</Text>
            <Text style={s.metaMuted}>{data.date}</Text>
            <Text style={s.metaMuted}>Status: {data.statusLabel}</Text>
          </View>
        </View>

        <View style={s.rule} />

        {/* Parties */}
        <View style={s.parties}>
          <View style={s.party}>
            <Text style={s.partyLabel}>De la</Text>
            <Text style={s.partyName}>{data.shop.legal?.legalName ?? data.shop.name}</Text>
            {data.shop.address ? <Text style={s.partyLine}>{data.shop.address}</Text> : null}
            {data.shop.phone ? <Text style={s.partyLine}>{data.shop.phone}</Text> : null}
            {data.shop.legal?.fiscalCode ? (
              <Text style={s.partyLine}>CUI: {data.shop.legal.fiscalCode}</Text>
            ) : null}
            {data.shop.legal?.regCom ? (
              <Text style={s.partyLine}>Reg. com.: {data.shop.legal.regCom}</Text>
            ) : null}
            {data.shop.legal?.vatNumber ? (
              <Text style={s.partyLine}>TVA: {data.shop.legal.vatNumber}</Text>
            ) : null}
          </View>
          <View style={s.party}>
            <Text style={s.partyLabel}>Pentru</Text>
            <Text style={s.partyName}>{data.customer.name}</Text>
            {data.customer.phone ? <Text style={s.partyLine}>{data.customer.phone}</Text> : null}
            <Text style={s.partyLine}>
              {data.fulfilment === "delivery"
                ? `Livrare: ${data.deliveryAddress ?? "—"}`
                : "Ridicare din magazin"}
            </Text>
          </View>
        </View>

        {/* Items */}
        <View style={s.tableHead}>
          <Text style={[s.th, s.colName]}>Produs / serviciu</Text>
          <Text style={[s.th, s.colQty]}>Cant.</Text>
          <Text style={[s.th, s.colTotal]}>Total</Text>
        </View>
        {data.lines.map((l, i) => (
          <View style={s.row} key={i} wrap={false}>
            <View style={s.colName}>
              <Text style={s.itemTitle}>{l.title}</Text>
              {l.summary ? <Text style={s.itemSummary}>{l.summary}</Text> : null}
            </View>
            <Text style={[s.colQty, { fontSize: 10 }]}>{l.quantity}</Text>
            <Text style={[s.colTotal, { fontSize: 10 }]}>{lei(l.lineTotal)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Subtotal</Text>
            <Text style={s.totalValue}>{lei(data.subtotal)}</Text>
          </View>
          {data.discount > 0 ? (
            <>
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Reducere</Text>
                <Text style={[s.totalValue, { color: BRAND }]}>−{lei(data.discount)}</Text>
              </View>
              {data.appliedOffers.length ? (
                <Text style={s.offerNote}>{data.appliedOffers.map((o) => o.name).join(", ")}</Text>
              ) : null}
            </>
          ) : null}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Livrare</Text>
            <Text style={s.totalValue}>{data.shippingFee > 0 ? lei(data.shippingFee) : "Gratuit"}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Taxă serviciu</Text>
            <Text style={s.totalValue}>{lei(data.serviceFee)}</Text>
          </View>
          <View style={s.grandRow}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandValue}>{lei(data.total)}</Text>
          </View>
        </View>

        {/* Payment */}
        <View style={s.payBox}>
          <Text>Plată: {data.paymentMethod}</Text>
          <Text style={{ fontWeight: "bold" }}>{data.paymentStatus}</Text>
        </View>

        {data.notes ? (
          <Text style={[s.metaMuted, { marginTop: 14 }]}>Observații: {data.notes}</Text>
        ) : null}

        <Text style={s.footer} fixed>
          Acest document este o chitanță, nu o factură fiscală. · Generat de Sprintr · Iași
        </Text>
      </Page>
    </Document>
  );
}
