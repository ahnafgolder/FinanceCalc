export function generateStaticParams() {
  return [
    { type: 'outstanding' },
    { type: 'payments-summary' },
    { type: 'full-transactions' },
    { type: 'account-statement' },
  ];
}

export default function ReportTypeLayout({ children }) {
  return children;
}
