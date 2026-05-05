import './globals.css';

export const metadata = {
  title: 'FinanceCalc — Billing & Payment Manager',
  description: 'Manage account holders, bills, and payments with powerful reporting',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
