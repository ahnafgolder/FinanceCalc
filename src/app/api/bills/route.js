import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';
import AccountHolder from '@/models/AccountHolder';
import { jsonResponse } from '@/lib/apiResponse';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const query = { userId: session.user.id };
    if (searchParams.get('status')) query.status = searchParams.get('status');
    if (searchParams.get('accountHolderId')) query.accountHolderId = searchParams.get('accountHolderId');

    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .select('billNumber description totalAmount dueDate type status createdAt accountHolderId')
      .populate('accountHolderId', 'name')
      .lean();

    return jsonResponse(bills);
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

    // Validate type based on account holder
    const holder = await AccountHolder.findById(body.accountHolderId);
    if (!holder) return NextResponse.json({ error: 'Account holder not found' }, { status: 404 });
    
    let type = body.type || 'receivable';
    if (holder.type === 'client') type = 'receivable';
    if (holder.type === 'vendor') type = 'payable';

    // Auto-generate bill number
    const count = await Bill.countDocuments({ userId: session.user.id });
    const billNumber = `BILL-${String(count + 1).padStart(4, '0')}`;

    const bill = await Bill.create({ ...body, type, billNumber, userId: session.user.id });
    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
