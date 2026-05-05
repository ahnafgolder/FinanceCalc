import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const bill = await Bill.findOne({ _id: params.id, userId: session.user.id }).populate('accountHolderId');
    if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const payments = await Payment.find({ billId: bill._id }).sort({ paymentDate: -1 });
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

    return NextResponse.json({ bill, payments, totalPaid, remaining: bill.totalAmount - totalPaid });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const body = await request.json();
    const bill = await Bill.findOneAndUpdate({ _id: params.id, userId: session.user.id }, body, { new: true, runValidators: true });
    if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(bill);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const bill = await Bill.findOneAndDelete({ _id: params.id, userId: session.user.id });
    if (!bill) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    await Payment.deleteMany({ billId: params.id });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
