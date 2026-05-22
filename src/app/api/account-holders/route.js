import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import AccountHolder from '@/models/AccountHolder';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';
import mongoose from 'mongoose';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Run holders, bill aggregation, and payment aggregation in parallel
    const [holders, billsByHolder, paymentsByHolder] = await Promise.all([
      AccountHolder.find({ userId }).sort({ createdAt: -1 }).lean(),

      // Aggregate bills grouped by accountHolderId and type
      Bill.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { accountHolderId: '$accountHolderId', type: '$type' },
            total: { $sum: '$totalAmount' },
          }
        }
      ]),

      // Aggregate payments grouped by accountHolderId and type
      Payment.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: { accountHolderId: '$accountHolderId', type: '$type' },
            total: { $sum: '$amount' },
          }
        }
      ]),
    ]);

    // Build lookup maps from aggregation results
    const billMap = {};  // key: "holderId_type" → total
    billsByHolder.forEach(b => {
      billMap[`${b._id.accountHolderId}_${b._id.type}`] = b.total;
    });

    const payMap = {};
    paymentsByHolder.forEach(p => {
      payMap[`${p._id.accountHolderId}_${p._id.type}`] = p.total;
    });

    // Enrich each holder with computed balances (no extra queries)
    const holdersWithBalance = holders.map(h => {
      const hid = h._id.toString();
      const totalReceivable = billMap[`${hid}_receivable`] || 0;
      const totalPayable = billMap[`${hid}_payable`] || 0;
      const totalCollected = payMap[`${hid}_received`] || 0;
      const totalPaidOut = payMap[`${hid}_paid`] || 0;

      const totalBilled = totalReceivable + totalPayable;
      const totalPaid = totalCollected + totalPaidOut;

      return {
        ...h,
        totalBilled,
        totalPaid,
        outstanding: totalBilled - totalPaid,
        totalReceivable,
        totalPayable,
        totalCollected,
        totalPaidOut,
        outstandingReceivable: totalReceivable - totalCollected,
        outstandingPayable: totalPayable - totalPaidOut,
      };
    });

    return NextResponse.json(holdersWithBalance);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const body = await request.json();
    const holder = await AccountHolder.create({ ...body, userId: session.user.id });
    return NextResponse.json(holder, { status: 201 });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
