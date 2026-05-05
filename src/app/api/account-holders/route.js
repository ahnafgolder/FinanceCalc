import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import AccountHolder from '@/models/AccountHolder';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const holders = await AccountHolder.find({ userId: session.user.id }).sort({ createdAt: -1 });

    // Calculate balances for each holder
    const holdersWithBalance = await Promise.all(holders.map(async (h) => {
      const bills = await Bill.find({ accountHolderId: h._id });
      const payments = await Payment.find({ accountHolderId: h._id });
      const totalBilled = bills.reduce((s, b) => s + b.totalAmount, 0);
      const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
      return { ...h.toObject(), totalBilled, totalPaid, outstanding: totalBilled - totalPaid };
    }));

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
