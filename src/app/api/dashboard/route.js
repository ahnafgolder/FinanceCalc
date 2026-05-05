import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import AccountHolder from '@/models/AccountHolder';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const userId = session.user.id;

    const totalHolders = await AccountHolder.countDocuments({ userId });
    const bills = await Bill.find({ userId });
    const totalBills = bills.length;
    const totalBillAmount = bills.reduce((sum, b) => sum + b.totalAmount, 0);
    const unpaidBills = bills.filter(b => b.status !== 'paid').length;

    const payments = await Payment.find({ userId });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const totalOutstanding = totalBillAmount - totalPaid;

    // This month stats
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthPayments = payments.filter(p => new Date(p.paymentDate) >= monthStart);
    const monthPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
    const monthBills = bills.filter(b => new Date(b.createdAt) >= monthStart);
    const monthBillAmount = monthBills.reduce((sum, b) => sum + b.totalAmount, 0);

    // Recent items
    const recentBills = await Bill.find({ userId }).sort({ createdAt: -1 }).limit(5).populate('accountHolderId', 'name');
    const recentPayments = await Payment.find({ userId }).sort({ createdAt: -1 }).limit(5).populate('accountHolderId', 'name').populate('billId', 'billNumber');

    return NextResponse.json({
      stats: { totalHolders, totalBills, totalBillAmount, totalPaid, totalOutstanding, unpaidBills, monthPaid, monthBillAmount },
      recentBills,
      recentPayments,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
