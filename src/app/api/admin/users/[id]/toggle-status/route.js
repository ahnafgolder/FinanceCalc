import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export async function POST(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = params;

    // Prevent admin from toggling their own account status
    if (session.user.id === id) {
      return NextResponse.json({ error: 'You cannot freeze or unfreeze your own account' }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Toggle between active and frozen
    const nextStatus = user.status === 'frozen' ? 'active' : 'frozen';
    user.status = nextStatus;
    await user.save();

    return NextResponse.json({
      message: `Account for ${user.name} has been ${nextStatus === 'frozen' ? 'frozen' : 'activated'}`,
      status: nextStatus,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}
