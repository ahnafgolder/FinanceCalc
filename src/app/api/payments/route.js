import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Payment from '@/models/Payment';
import Bill from '@/models/Bill';
import { jsonResponse } from '@/lib/apiResponse';
import { updateBillAfterPayment } from '@/lib/billUtils';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const payments = await Payment.find({ userId: session.user.id })
      .sort({ paymentDate: -1 })
      .select('amount type paymentMethod referenceNumber note paymentDate createdAt accountHolderId billId')
      .populate('accountHolderId', 'name')
      .populate('billId', 'billNumber category')
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
    const bill = await Bill.findOne({ _id: body.billId, userId: session.user.id });
    if (!bill) return NextResponse.json({ error: 'Bill not found' }, { status: 404 });

    const paymentType = bill.type === 'payable' ? 'paid' : 'received';
    const payment = await Payment.create({ ...body, type: paymentType, userId: session.user.id });
    await updateBillAfterPayment(bill);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return NextResponse.json({ error: Object.values(error.errors).map((e) => e.message).join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
