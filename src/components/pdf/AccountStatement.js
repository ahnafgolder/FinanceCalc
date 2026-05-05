import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const s = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#1a1a2e' },
  header: { marginBottom: 20, borderBottom: '2px solid #f59e0b', paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: 'bold' },
  subtitle: { fontSize: 10, color: '#64748b', marginTop: 4 },
  infoBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginBottom: 20, padding: 12, backgroundColor: '#f8fafc', borderRadius: 4 },
  infoItem: {},
  infoLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase' },
  infoValue: { fontSize: 11, fontWeight: 'bold', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 20, marginBottom: 8, color: '#1a1a2e' },
  table: { marginTop: 4 },
  thRow: { flexDirection: 'row', backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', paddingVertical: 8 },
  tr: { flexDirection: 'row', borderBottom: '1px solid #f1f5f9', paddingVertical: 7 },
  td: { paddingHorizontal: 6 },
  bold: { fontWeight: 'bold' },
  right: { textAlign: 'right' },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
  totalRow: { flexDirection: 'row', borderTop: '2px solid #1a1a2e', paddingVertical: 8, marginTop: 4 },
  summaryBox: { flexDirection: 'row', gap: 30, marginTop: 20, marginBottom: 10 },
  summaryItem: { padding: 12, flex: 1, borderRadius: 4, border: '1px solid #e2e8f0' },
  summaryLabel: { fontSize: 9, color: '#64748b' },
  summaryValue: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
});

const fmt = (n) => `৳${(n || 0).toLocaleString()}`;
const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function AccountStatement({ data, startDate, endDate }) {
  const { holder, bills, payments } = data;
  const totalBilled = bills?.reduce((s, b) => s + b.totalAmount, 0) || 0;
  const totalPaid = payments?.reduce((s, p) => s + p.amount, 0) || 0;
  const dateRange = startDate && endDate ? `${startDate} to ${endDate}` : startDate ? `From ${startDate}` : endDate ? `Until ${endDate}` : 'All Time';

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Account Statement</Text>
          <Text style={s.subtitle}>{holder?.name} • {dateRange} • Generated {new Date().toLocaleDateString()}</Text>
        </View>

        <View style={s.infoBox}>
          <View style={s.infoItem}><Text style={s.infoLabel}>Name</Text><Text style={s.infoValue}>{holder?.name}</Text></View>
          <View style={s.infoItem}><Text style={s.infoLabel}>Type</Text><Text style={s.infoValue}>{holder?.type?.toUpperCase()}</Text></View>
          {holder?.bankName && <View style={s.infoItem}><Text style={s.infoLabel}>Bank</Text><Text style={s.infoValue}>{holder.bankName}</Text></View>}
          {holder?.phone && <View style={s.infoItem}><Text style={s.infoLabel}>Phone</Text><Text style={s.infoValue}>{holder.phone}</Text></View>}
        </View>

        <View style={s.summaryBox}>
          <View style={s.summaryItem}><Text style={s.summaryLabel}>Total Billed</Text><Text style={s.summaryValue}>{fmt(totalBilled)}</Text></View>
          <View style={s.summaryItem}><Text style={s.summaryLabel}>Total Paid</Text><Text style={[s.summaryValue, { color: '#10b981' }]}>{fmt(totalPaid)}</Text></View>
          <View style={s.summaryItem}><Text style={s.summaryLabel}>Outstanding</Text><Text style={[s.summaryValue, { color: totalBilled - totalPaid > 0 ? '#ef4444' : '#10b981' }]}>{fmt(totalBilled - totalPaid)}</Text></View>
        </View>

        <Text style={s.sectionTitle}>Bills ({bills?.length || 0})</Text>
        <View style={s.table}>
          <View style={s.thRow}>
            <Text style={[s.td, s.bold, { width: '20%' }]}>Bill #</Text>
            <Text style={[s.td, s.bold, { width: '30%' }]}>Description</Text>
            <Text style={[s.td, s.bold, { width: '20%' }]}>Date</Text>
            <Text style={[s.td, s.bold, { width: '15%' }]}>Status</Text>
            <Text style={[s.td, s.bold, s.right, { width: '15%' }]}>Amount</Text>
          </View>
          {bills?.map((b, i) => (
            <View style={s.tr} key={i}>
              <Text style={[s.td, { width: '20%' }]}>{b.billNumber}</Text>
              <Text style={[s.td, { width: '30%' }]}>{b.description || '—'}</Text>
              <Text style={[s.td, { width: '20%' }]}>{fmtDate(b.createdAt)}</Text>
              <Text style={[s.td, { width: '15%' }]}>{b.status?.toUpperCase()}</Text>
              <Text style={[s.td, s.right, s.bold, { width: '15%' }]}>{fmt(b.totalAmount)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.sectionTitle}>Payments ({payments?.length || 0})</Text>
        <View style={s.table}>
          <View style={s.thRow}>
            <Text style={[s.td, s.bold, { width: '20%' }]}>Date</Text>
            <Text style={[s.td, s.bold, { width: '20%' }]}>Bill</Text>
            <Text style={[s.td, s.bold, { width: '20%' }]}>Method</Text>
            <Text style={[s.td, s.bold, { width: '20%' }]}>Note</Text>
            <Text style={[s.td, s.bold, s.right, { width: '20%' }]}>Amount</Text>
          </View>
          {payments?.map((p, i) => (
            <View style={s.tr} key={i}>
              <Text style={[s.td, { width: '20%' }]}>{fmtDate(p.paymentDate)}</Text>
              <Text style={[s.td, { width: '20%' }]}>{p.billId?.billNumber || '—'}</Text>
              <Text style={[s.td, { width: '20%' }]}>{p.paymentMethod?.replace('_', ' ')}</Text>
              <Text style={[s.td, { width: '20%' }]}>{p.note || '—'}</Text>
              <Text style={[s.td, s.right, s.bold, { width: '20%', color: '#10b981' }]}>{fmt(p.amount)}</Text>
            </View>
          ))}
        </View>

        <Text style={s.footer}>FinanceCalc — Account Statement for {holder?.name}</Text>
      </Page>
    </Document>
  );
}
