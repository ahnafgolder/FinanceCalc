import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import AccountHolder from '@/models/AccountHolder';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';
import mongoose from 'mongoose';
import { jsonResponse } from '@/lib/apiResponse';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await dbConnect();
    const userId = new mongoose.Types.ObjectId(session.user.id);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run all queries in parallel
    const [totalHolders, billAgg, paymentAgg, recentBills, recentPayments] = await Promise.all([
      AccountHolder.countDocuments({ userId }),

      // Aggregate bills: totals by type + monthly + unpaid count
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
                  '$totalAmount', 0
                ]
              }
            },
          }
        }
      ]),

      // Aggregate payments: totals by type + monthly
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
                  '$amount', 0
                ]
              }
            },
            monthPaidOut: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$type', 'paid'] }, { $gte: ['$paymentDate', monthStart] }] },
                  '$amount', 0
                ]
              }
            },
          }
        }
      ]),

      Bill.find({ userId }).sort({ createdAt: -1 }).limit(5).populate('accountHolderId', 'name').lean(),
      Payment.find({ userId }).sort({ createdAt: -1 }).limit(5).populate('accountHolderId', 'name').populate('billId', 'billNumber').lean(),
    ]);

    const b = billAgg[0] || { totalReceivable: 0, totalPayable: 0, totalBills: 0, unpaidBills: 0, monthReceivable: 0 };
    const p = paymentAgg[0] || { totalCollected: 0, totalPaidOut: 0, monthCollected: 0, monthPaidOut: 0 };

    return jsonResponse({
      stats: {
        totalHolders,
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
      },
      recentBills,
      recentPayments,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
