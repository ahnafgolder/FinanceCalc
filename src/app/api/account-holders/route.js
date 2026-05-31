import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import AccountHolder from '@/models/AccountHolder';
import mongoose from 'mongoose';
import { jsonResponse } from '@/lib/apiResponse';
import { getHoldersWithBalances } from '@/lib/holderBalances';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    await dbConnect();

    const userId = new mongoose.Types.ObjectId(session.user.id);
    const holdersWithBalance = await getHoldersWithBalances(userId);

    return jsonResponse(holdersWithBalance);
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
