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
  billTag: { color: '#ef4444' },
  payTag: { color: '#10b981' },
});

const fmt = (n) => `৳${(n || 0).toLocaleString()}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function FullTransactions({ data, startDate, endDate }) {
  const totalBills = data.filter(t => t.type === 'BILL').reduce((s, t) => s + t.amount, 0);
  const totalPayments = data.filter(t => t.type === 'PAYMENT').reduce((s, t) => s + t.amount, 0);
  const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : 'All Time';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Full Transactions Report</Text>
          <Text style={s.subtitle}>FinanceCalc • {dateRange} • Generated {new Date().toLocaleDateString()}</Text>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 16, gap: 20 }}>
          <Text style={s.bold}>Total Billed: <Text style={s.billTag}>{fmt(totalBills)}</Text></Text>
          <Text style={s.bold}>Total Paid: <Text style={s.payTag}>{fmt(totalPayments)}</Text></Text>
          <Text style={s.bold}>Net Outstanding: {fmt(totalBills - totalPayments)}</Text>
        </View>
        <View style={s.table}>
          <View style={s.thRow}>
            <Text style={[s.td, s.bold, { width: '18%' }]}>Date</Text>
            <Text style={[s.td, s.bold, { width: '15%' }]}>Type</Text>
            <Text style={[s.td, s.bold, { width: '25%' }]}>Account Holder</Text>
            <Text style={[s.td, s.bold, { width: '20%' }]}>Reference</Text>
            <Text style={[s.td, s.bold, s.right, { width: '22%' }]}>Amount</Text>
          </View>
          {data.map((t, i) => (
            <View style={s.tr} key={i}>
              <Text style={[s.td, { width: '18%' }]}>{fmtDate(t.date)}</Text>
              <Text style={[s.td, t.type === 'BILL' ? s.billTag : s.payTag, { width: '15%' }]}>{t.type}</Text>
              <Text style={[s.td, { width: '25%' }]}>{t.holder || '—'}</Text>
              <Text style={[s.td, { width: '20%' }]}>{t.ref || '—'}</Text>
              <Text style={[s.td, s.right, s.bold, t.type === 'BILL' ? s.billTag : s.payTag, { width: '22%' }]}>{t.type === 'BILL' ? '-' : '+'}{fmt(t.amount)}</Text>
            </View>
          ))}
        </View>
        <Text style={s.footer}>FinanceCalc — Full Transactions Report</Text>
      </Page>
    </Document>
  );
}
