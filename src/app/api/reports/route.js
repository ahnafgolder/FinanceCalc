import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';
import AccountHolder from '@/models/AccountHolder';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const holderId = searchParams.get('holderId');
    const userId = new mongoose.Types.ObjectId(session.user.id);

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    const hasDateFilter = startDate || endDate;

    if (type === 'outstanding') {
      const query = { userId, status: { $ne: 'paid' } };
      if (hasDateFilter) query.createdAt = dateFilter;

      // Use aggregation to join payment totals in one query instead of N+1
      const outstandingData = await Bill.aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        // Lookup account holder name
        {
          $lookup: {
            from: 'accountholders',
            localField: 'accountHolderId',
            foreignField: '_id',
            as: 'accountHolderInfo',
          }
        },
        // Lookup payment totals per bill
        {
          $lookup: {
            from: 'payments',
            localField: '_id',
            foreignField: 'billId',
            as: 'billPayments',
          }
        },
        {
          $addFields: {
            accountHolderId: {
              $mergeObjects: [
                { $arrayElemAt: ['$accountHolderInfo', 0] },
              ]
            },
            paid: { $sum: '$billPayments.amount' },
          }
        },
        {
          $addFields: {
            remaining: { $subtract: ['$totalAmount', '$paid'] },
          }
        },
        {
          $project: {
            accountHolderInfo: 0,
            billPayments: 0,
          }
        },
      ]);

      return NextResponse.json(outstandingData);
    }

    if (type === 'payments-summary') {
      const query = { userId };
      if (hasDateFilter) query.paymentDate = dateFilter;

      // Use aggregation to group by account holder directly
      const summary = await Payment.aggregate([
        { $match: query },
        {
          $lookup: {
            from: 'accountholders',
            localField: 'accountHolderId',
            foreignField: '_id',
            as: 'holderInfo',
          }
        },
        {
          $group: {
            _id: '$accountHolderId',
            name: { $first: { $arrayElemAt: ['$holderInfo.name', 0] } },
            count: { $sum: 1 },
            total: { $sum: '$amount' },
          }
        },
        { $match: { _id: { $ne: null } } },
        { $sort: { total: -1 } },
      ]);

      return NextResponse.json(summary);
    }

    if (type === 'full-transactions') {
      const bQuery = { userId };
      if (hasDateFilter) bQuery.createdAt = dateFilter;

      const pQuery = { userId };
      if (hasDateFilter) pQuery.paymentDate = dateFilter;

      // Run both queries in parallel with .lean()
      const [bills, payments] = await Promise.all([
        Bill.find(bQuery).populate('accountHolderId', 'name').lean(),
        Payment.find(pQuery).populate('accountHolderId', 'name').populate('billId', 'billNumber').lean(),
      ]);

      const transactions = [
        ...bills.map(b => ({ type: 'BILL', date: b.createdAt, amount: b.totalAmount, holder: b.accountHolderId?.name, ref: b.billNumber, id: b._id })),
        ...payments.map(p => ({ type: 'PAYMENT', date: p.paymentDate, amount: p.amount, holder: p.accountHolderId?.name, ref: p.billId?.billNumber || p.referenceNumber, id: p._id }))
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return NextResponse.json(transactions);
    }

    if (type === 'account-statement') {
      if (!holderId) return NextResponse.json({ error: 'Holder ID required' }, { status: 400 });
      const holder = await AccountHolder.findOne({ _id: holderId, userId }).lean();
      if (!holder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const bQuery = { accountHolderId: holder._id };
      if (hasDateFilter) bQuery.createdAt = dateFilter;

      const pQuery = { accountHolderId: holder._id };
      if (hasDateFilter) pQuery.paymentDate = dateFilter;

      // Run both queries in parallel with .lean()
      const [bills, payments] = await Promise.all([
        Bill.find(bQuery).sort({ createdAt: 1 }).lean(),
        Payment.find(pQuery).sort({ paymentDate: 1 }).populate('billId', 'billNumber').lean(),
      ]);

      return NextResponse.json({ holder, bills, payments });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
