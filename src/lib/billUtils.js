import Bill from '@/models/Bill';
import Payment from '@/models/Payment';
import { advanceNextDueDate } from '@/lib/loanUtils';

export async function generateRecordNumber(userId, category = 'bill') {
  const prefix = category === 'loan' ? 'LOAN' : 'BILL';
  const count = await Bill.countDocuments({ userId, category });
  return `${prefix}-${String(count + 1).padStart(4, '0')}`;
}

export async function enrichBillsWithRemaining(bills) {
  if (!bills.length) return [];

  const ids = bills.map((b) => b._id);
  const paidRows = await Payment.aggregate([
    { $match: { billId: { $in: ids } } },
    { $group: { _id: '$billId', totalPaid: { $sum: '$amount' } } },
  ]);
  const paidMap = Object.fromEntries(paidRows.map((r) => [r._id.toString(), r.totalPaid]));

  return bills.map((b) => {
    const paid = paidMap[b._id.toString()] || 0;
    return {
      ...b,
      totalPaid: paid,
      remaining: Math.max(0, b.totalAmount - paid),
    };
  });
}

export async function updateBillAfterPayment(bill) {
  const [{ totalPaid = 0 } = {}] = await Payment.aggregate([
    { $match: { billId: bill._id } },
    { $group: { _id: null, totalPaid: { $sum: '$amount' } } },
  ]);

  if (totalPaid >= bill.totalAmount) {
    bill.status = 'paid';
    bill.nextDueDate = null;
  } else if (totalPaid > 0) {
    bill.status = 'partial';
    if (bill.category === 'loan' && bill.nextDueDate) {
      bill.nextDueDate = advanceNextDueDate(bill.nextDueDate, bill.installmentFrequency);
    }
  } else {
    bill.status = 'unpaid';
  }

  await bill.save();
  return { totalPaid, remaining: Math.max(0, bill.totalAmount - totalPaid) };
}
