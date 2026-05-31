import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import Bill from '@/models/Bill';
import AccountHolder from '@/models/AccountHolder';
import { jsonResponse } from '@/lib/apiResponse';
import { generateRecordNumber } from '@/lib/billUtils';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const query = { userId: session.user.id };
    if (searchParams.get('status')) query.status = searchParams.get('status');
    if (searchParams.get('accountHolderId')) query.accountHolderId = searchParams.get('accountHolderId');
    if (searchParams.get('category')) query.category = searchParams.get('category');

    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .select('billNumber description totalAmount dueDate nextDueDate type status category installmentAmount installmentFrequency interestRate createdAt accountHolderId')
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
    const holder = await AccountHolder.findById(body.accountHolderId);
    if (!holder) return NextResponse.json({ error: 'Account holder not found' }, { status: 404 });

    let type = body.type || 'receivable';
    if (holder.type === 'client') type = 'receivable';
    if (holder.type === 'vendor') type = 'payable';

    const category = body.category === 'loan' ? 'loan' : 'bill';
    const billNumber = await generateRecordNumber(session.user.id, category);
    const nextDueDate = body.nextDueDate || body.dueDate || null;

    const bill = await Bill.create({
      accountHolderId: body.accountHolderId,
      description: body.description || (category === 'loan' ? 'Loan' : ''),
      totalAmount: body.totalAmount,
      dueDate: body.dueDate || nextDueDate || null,
      type,
      category,
      installmentAmount: body.installmentAmount || null,
      installmentFrequency: body.installmentFrequency || 'flexible',
      interestRate: body.interestRate || 0,
      nextDueDate,
      billNumber,
      userId: session.user.id,
    });

    return NextResponse.json(bill, { status: 201 });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return NextResponse.json({ error: messages.join(', ') }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
