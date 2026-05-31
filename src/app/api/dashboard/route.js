import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';
import mongoose from 'mongoose';
import { jsonResponse } from '@/lib/apiResponse';
import { getHoldersWithBalances, splitOwesMeAndIOwe } from '@/lib/holderBalances';
import { enrichBillsWithRemaining } from '@/lib/billUtils';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekEnd = new Date(todayStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    weekEnd.setHours(23, 59, 59, 999);

    const [holdersWithBalance, billAgg, paymentAgg, recentBills, recentPayments, dueThisWeek, overdueBills, activeLoansRaw] =
      await Promise.all([
        getHoldersWithBalances(userId),

        Bill.aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: null,
              totalReceivable: { $sum: { $cond: [{ $eq: ['$type', 'receivable'] }, '$totalAmount', 0] } },
              totalPayable: { $sum: { $cond: [{ $eq: ['$type', 'payable'] }, '$totalAmount', 0] } },
              totalBills: { $sum: 1 },
              unpaidBills: { $sum: { $cond: [{ $ne: ['$status', 'paid'] }, 1, 0] } },
              monthReceivable: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ['$type', 'receivable'] }, { $gte: ['$createdAt', monthStart] }] },
                    '$totalAmount',
                    0,
                  ],
                },
              },
            },
          },
        ]),

        Payment.aggregate([
          { $match: { userId } },
          {
            $group: {
              _id: null,
              totalCollected: { $sum: { $cond: [{ $eq: ['$type', 'received'] }, '$amount', 0] } },
              totalPaidOut: { $sum: { $cond: [{ $eq: ['$type', 'paid'] }, '$amount', 0] } },
              monthCollected: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ['$type', 'received'] }, { $gte: ['$paymentDate', monthStart] }] },
                    '$amount',
                    0,
                  ],
                },
              },
              monthPaidOut: {
                $sum: {
                  $cond: [
                    { $and: [{ $eq: ['$type', 'paid'] }, { $gte: ['$paymentDate', monthStart] }] },
                    '$amount',
                    0,
                  ],
                },
              },
            },
          },
        ]),

        Bill.find({ userId }).sort({ createdAt: -1 }).limit(5).populate('accountHolderId', 'name').lean(),
        Payment.find({ userId })
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('accountHolderId', 'name')
          .populate('billId', 'billNumber')
          .lean(),

        Bill.find({
          userId,
          status: { $ne: 'paid' },
          dueDate: { $gte: todayStart, $lte: weekEnd },
        })
          .sort({ dueDate: 1 })
          .populate('accountHolderId', 'name phone')
          .select('billNumber totalAmount dueDate type status accountHolderId')
          .lean(),

        Bill.find({
          userId,
          status: { $ne: 'paid' },
          dueDate: { $lt: todayStart, $ne: null },
        })
          .sort({ dueDate: 1 })
          .limit(10)
          .populate('accountHolderId', 'name phone')
          .select('billNumber totalAmount dueDate type status accountHolderId')
          .lean(),

        Bill.find({
          userId,
          category: 'loan',
          status: { $ne: 'paid' },
        })
          .sort({ nextDueDate: 1, createdAt: -1 })
          .limit(10)
          .populate('accountHolderId', 'name phone')
          .select('billNumber totalAmount nextDueDate dueDate type status category installmentAmount installmentFrequency accountHolderId')
          .lean(),
      ]);

    const activeLoans = await enrichBillsWithRemaining(activeLoansRaw);

    const { owesMe, iOwe } = splitOwesMeAndIOwe(holdersWithBalance);
    const b = billAgg[0] || { totalReceivable: 0, totalPayable: 0, totalBills: 0, unpaidBills: 0, monthReceivable: 0 };
    const p = paymentAgg[0] || { totalCollected: 0, totalPaidOut: 0, monthCollected: 0, monthPaidOut: 0 };

    return jsonResponse({
      stats: {
        totalHolders: holdersWithBalance.length,
        totalBills: b.totalBills,
        totalReceivable: b.totalReceivable,
        totalPayable: b.totalPayable,
        totalCollected: p.totalCollected,
        totalPaidOut: p.totalPaidOut,
        outstandingReceivable: b.totalReceivable - p.totalCollected,
        outstandingPayable: b.totalPayable - p.totalPaidOut,
        unpaidBills: b.unpaidBills,
        monthCollected: p.monthCollected,
        monthPaidOut: p.monthPaidOut,
        monthReceivable: b.monthReceivable,
        overdueCount: overdueBills.length,
        activeLoansCount: activeLoans.length,
      },
      owesMe,
      iOwe,
      dueThisWeek,
      overdueBills,
      activeLoans,
      recentBills,
      recentPayments,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
