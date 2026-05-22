import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Payment from '@/models/Payment';
import Bill from '@/models/Bill';

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const payment = await Payment.findOneAndDelete({ _id: params.id, userId: session.user.id });
    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Recalculate bill status using aggregation
    const bill = await Bill.findById(payment.billId);
    if (bill) {
      const result = await Payment.aggregate([
        { $match: { billId: bill._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]);
      const totalPaid = result[0]?.total || 0;
      if (totalPaid >= bill.totalAmount) bill.status = 'paid';
      else if (totalPaid > 0) bill.status = 'partial';
      else bill.status = 'unpaid';
      await bill.save();
    }

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
