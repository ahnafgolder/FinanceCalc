import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import AccountHolder from '@/models/AccountHolder';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const holder = await AccountHolder.findOne({ _id: params.id, userId: session.user.id }).lean();
    if (!holder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Run bills and payments queries in parallel
    const [bills, payments] = await Promise.all([
      Bill.find({ accountHolderId: holder._id }).sort({ createdAt: -1 }).lean(),
      Payment.find({ accountHolderId: holder._id }).sort({ paymentDate: -1 }).populate('billId', 'billNumber').lean(),
    ]);

    const totalReceivable = bills.filter(b => b.type === 'receivable').reduce((s, b) => s + b.totalAmount, 0);
    const totalPayable = bills.filter(b => b.type === 'payable').reduce((s, b) => s + b.totalAmount, 0);
    const totalCollected = payments.filter(p => p.type === 'received').reduce((s, p) => s + p.amount, 0);
    const totalPaidOut = payments.filter(p => p.type === 'paid').reduce((s, p) => s + p.amount, 0);

    const totalBilled = totalReceivable + totalPayable;
    const totalPaid = totalCollected + totalPaidOut;

    return NextResponse.json({ 
      holder, bills, payments, 
      totalBilled, 
      totalPaid, 
      outstanding: totalBilled - totalPaid,
      totalReceivable,
      totalPayable,
      totalCollected,
      totalPaidOut,
      outstandingReceivable: totalReceivable - totalCollected,
      outstandingPayable: totalPayable - totalPaidOut
    });
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
    const holder = await AccountHolder.findOneAndUpdate(
      { _id: params.id, userId: session.user.id },
      body,
      { new: true, runValidators: true }
    );
    if (!holder) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(holder);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const holder = await AccountHolder.findOneAndDelete({ _id: params.id, userId: session.user.id });
    if (!holder) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await Bill.deleteMany({ accountHolderId: params.id });
    await Payment.deleteMany({ accountHolderId: params.id });

    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
