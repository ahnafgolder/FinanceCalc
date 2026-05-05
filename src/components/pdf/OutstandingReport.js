import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a2e' },
  header: { marginBottom: 20, borderBottom: '2px solid #f59e0b', paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a2e' },
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

export default function OutstandingReport({ data, startDate, endDate }) {
  const totalBilled = data.reduce((s, b) => s + b.totalAmount, 0);
  const totalPaid = data.reduce((s, b) => s + b.paid, 0);
  const totalRemaining = data.reduce((s, b) => s + b.remaining, 0);
  const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : 'All Time';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Outstanding Balances Report</Text>
          <Text style={s.subtitle}>FinanceCalc • {dateRange} • Generated {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={s.table}>
          <View style={s.thRow}>
            <Text style={[s.td, s.bold, { width: '15%' }]}>Bill #</Text>
            <Text style={[s.td, s.bold, { width: '25%' }]}>Account Holder</Text>
            <Text style={[s.td, s.bold, { width: '15%' }]}>Status</Text>
            <Text style={[s.td, s.bold, s.right, { width: '15%' }]}>Billed</Text>
            <Text style={[s.td, s.bold, s.right, { width: '15%' }]}>Paid</Text>
            <Text style={[s.td, s.bold, s.right, { width: '15%' }]}>Remaining</Text>
          </View>
          {data.map((b, i) => (
            <View style={s.tr} key={i}>
              <Text style={[s.td, { width: '15%' }]}>{b.billNumber}</Text>
              <Text style={[s.td, { width: '25%' }]}>{b.accountHolderId?.name || '—'}</Text>
              <Text style={[s.td, { width: '15%' }]}>{b.status?.toUpperCase()}</Text>
              <Text style={[s.td, s.right, { width: '15%' }]}>{fmt(b.totalAmount)}</Text>
              <Text style={[s.td, s.right, { width: '15%' }]}>{fmt(b.paid)}</Text>
              <Text style={[s.td, s.right, s.bold, { width: '15%' }]}>{fmt(b.remaining)}</Text>
            </View>
          ))}
          <View style={s.totalRow}>
            <Text style={[s.td, s.bold, { width: '55%' }]}>TOTAL ({data.length} bills)</Text>
            <Text style={[s.td, s.right, s.bold, { width: '15%' }]}>{fmt(totalBilled)}</Text>
            <Text style={[s.td, s.right, s.bold, { width: '15%' }]}>{fmt(totalPaid)}</Text>
            <Text style={[s.td, s.right, s.bold, { width: '15%' }]}>{fmt(totalRemaining)}</Text>
          </View>
        </View>

        <Text style={s.footer}>FinanceCalc — Outstanding Balances Report</Text>
      </Page>
    </Document>
  );
}
