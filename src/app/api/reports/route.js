import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';
import AccountHolder from '@/models/AccountHolder';

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

    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }

    if (type === 'outstanding') {
      const query = { userId: session.user.id, status: { $ne: 'paid' } };
      if (startDate || endDate) query.createdAt = dateFilter;
      const bills = await Bill.find(query).sort({ createdAt: -1 }).populate('accountHolderId', 'name type');
      
      const outstandingData = await Promise.all(bills.map(async b => {
        const payments = await Payment.find({ billId: b._id });
        const paid = payments.reduce((s, p) => s + p.amount, 0);
        return { ...b.toObject(), paid, remaining: b.totalAmount - paid };
      }));
      return NextResponse.json(outstandingData);
    }

    if (type === 'payments-summary') {
      const query = { userId: session.user.id };
      if (startDate || endDate) query.paymentDate = dateFilter;
      const payments = await Payment.find(query).populate('accountHolderId', 'name');
      
      const summary = {};
      payments.forEach(p => {
        const id = p.accountHolderId?._id.toString();
        if (!id) return;
        if (!summary[id]) summary[id] = { name: p.accountHolderId.name, count: 0, total: 0 };
        summary[id].count += 1;
        summary[id].total += p.amount;
      });
      return NextResponse.json(Object.values(summary).sort((a, b) => b.total - a.total));
    }

    if (type === 'full-transactions') {
      const bQuery = { userId: session.user.id };
      if (startDate || endDate) bQuery.createdAt = dateFilter;
      const bills = await Bill.find(bQuery).populate('accountHolderId', 'name');
      
      const pQuery = { userId: session.user.id };
      if (startDate || endDate) pQuery.paymentDate = dateFilter;
      const payments = await Payment.find(pQuery).populate('accountHolderId', 'name').populate('billId', 'billNumber');

      const transactions = [
        ...bills.map(b => ({ type: 'BILL', date: b.createdAt, amount: b.totalAmount, holder: b.accountHolderId?.name, ref: b.billNumber, id: b._id })),
        ...payments.map(p => ({ type: 'PAYMENT', date: p.paymentDate, amount: p.amount, holder: p.accountHolderId?.name, ref: p.billId?.billNumber || p.referenceNumber, id: p._id }))
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return NextResponse.json(transactions);
    }

    if (type === 'account-statement') {
      if (!holderId) return NextResponse.json({ error: 'Holder ID required' }, { status: 400 });
      const holder = await AccountHolder.findOne({ _id: holderId, userId: session.user.id });
      if (!holder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const bQuery = { accountHolderId: holder._id };
      if (startDate || endDate) bQuery.createdAt = dateFilter;
      const bills = await Bill.find(bQuery).sort({ createdAt: 1 });

      const pQuery = { accountHolderId: holder._id };
      if (startDate || endDate) pQuery.paymentDate = dateFilter;
      const payments = await Payment.find(pQuery).sort({ paymentDate: 1 }).populate('billId', 'billNumber');

      return NextResponse.json({ holder, bills, payments });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
