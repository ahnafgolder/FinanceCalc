import ProtectedLayoutClient from '@/components/ProtectedLayoutClient';

export default function DashboardLayout({ children }) {
  return <ProtectedLayoutClient>{children}</ProtectedLayoutClient>;
}
