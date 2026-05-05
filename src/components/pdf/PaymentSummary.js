import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a2e' },
  header: { marginBottom: 20, borderBottom: '2px solid #f59e0b', paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 10, color: '#64748b', marginTop: 4 },
  table: { marginTop: 12 },
  thRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', paddingVertical: 8 },
  tr: { flexDirection: 'row', borderBottom: '1px solid #f1f5f9', paddingVertical: 7 },
  td: { paddingHorizontal: 6 },
  bold: { fontWeight: 'bold' },
  right: { textAlign: 'right' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
  totalRow: { flexDirection: 'row', borderTop: '2px solid #1a1a2e', paddingVertical: 8, marginTop: 4 },
});

const fmt = (n) => `৳${(n || 0).toLocaleString()}`;

export default function PaymentSummary({ data, startDate, endDate }) {
  const grandTotal = data.reduce((s, d) => s + d.total, 0);
  const totalCount = data.reduce((s, d) => s + d.count, 0);
  const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : 'All Time';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Payment Summary Report</Text>
          <Text style={s.subtitle}>FinanceCalc • {dateRange} • Generated {new Date().toLocaleDateString()}</Text>
        </View>
        <View style={s.table}>
          <View style={s.thRow}>
            <Text style={[s.td, s.bold, { width: '50%' }]}>Account Holder</Text>
            <Text style={[s.td, s.bold, s.right, { width: '25%' }]}>Payments</Text>
            <Text style={[s.td, s.bold, s.right, { width: '25%' }]}>Total Amount</Text>
          </View>
          {data.map((d, i) => (
            <View style={s.tr} key={i}>
              <Text style={[s.td, { width: '50%' }]}>{d.name}</Text>
              <Text style={[s.td, s.right, { width: '25%' }]}>{d.count}</Text>
              <Text style={[s.td, s.right, s.bold, { width: '25%' }]}>{fmt(d.total)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={[s.td, s.bold, { width: '50%' }]}>GRAND TOTAL</Text>
            <Text style={[s.td, s.right, s.bold, { width: '25%' }]}>{totalCount}</Text>
            <Text style={[s.td, s.right, s.bold, { width: '25%' }]}>{fmt(grandTotal)}</Text>
          </View>
        </View>
        <Text style={s.footer}>FinanceCalc — Payment Summary Report</Text>
      </Page>
    </Document>
  );
}
