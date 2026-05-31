import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Payment from '@/models/Payment';
import Bill from '@/models/Bill';
import { jsonResponse } from '@/lib/apiResponse';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const payments = await Payment.find({ userId: session.user.id })
      .sort({ paymentDate: -1 })
      .select('amount type paymentMethod referenceNumber note paymentDate createdAt accountHolderId billId')
      .populate('accountHolderId', 'name')
      .populate('billId', 'billNumber')
      .lean();
    return jsonResponse(payments);
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

    // Update bill status and derive type
    const bill = await Bill.findById(body.billId);
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

    const paymentType = bill.type === 'payable' ? 'paid' : 'received';
    const payment = await Payment.create({ ...body, type: paymentType, userId: session.user.id });

    const [{ totalPaid = 0 } = {}] = await Payment.aggregate([
      { $match: { billId: bill._id } },
      { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
    ]);

    if (totalPaid >= bill.totalAmount) bill.status = 'paid';
    else if (totalPaid > 0) bill.status = 'partial';
    else bill.status = 'unpaid';
    await bill.save();

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: Object.values(error.errors).map(e => e.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
