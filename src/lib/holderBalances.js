import AccountHolder from '@/models/AccountHolder';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';

export async function getHoldersWithBalances(userId) {
  const [holders, billsByHolder, paymentsByHolder] = await Promise.all([
    AccountHolder.find({ userId }).sort({ createdAt: -1 }).lean(),

    Bill.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { accountHolderId: '$accountHolderId', type: '$type' },
          total: { $sum: '$totalAmount' },
        },
      },
    ]),

    Payment.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { accountHolderId: '$accountHolderId', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const billMap = {};
  billsByHolder.forEach((b) => {
    billMap[`${b._id.accountHolderId}_${b._id.type}`] = b.total;
  });

  const payMap = {};
  paymentsByHolder.forEach((p) => {
    payMap[`${p._id.accountHolderId}_${p._id.type}`] = p.total;
  });

  return holders.map((h) => {
    const hid = h._id.toString();
    const totalReceivable = billMap[`${hid}_receivable`] || 0;
    const totalPayable = billMap[`${hid}_payable`] || 0;
    const totalCollected = payMap[`${hid}_received`] || 0;
    const totalPaidOut = payMap[`${hid}_paid`] || 0;
    const totalBilled = totalReceivable + totalPayable;
    const totalPaid = totalCollected + totalPaidOut;

    return {
      ...h,
      totalBilled,
      totalPaid,
      outstanding: totalBilled - totalPaid,
      totalReceivable,
      totalPayable,
      totalCollected,
      totalPaidOut,
      outstandingReceivable: totalReceivable - totalCollected,
      outstandingPayable: totalPayable - totalPaidOut,
    };
  });
}

export function splitOwesMeAndIOwe(holders) {
  const owesMe = holders
    .filter((h) => (h.outstandingReceivable || 0) > 0)
    .map((h) => ({
      _id: h._id,
      name: h.name,
      phone: h.phone,
      type: h.type,
      amount: h.outstandingReceivable,
    }))
    .sort((a, b) => b.amount - a.amount);

  const iOwe = holders
    .filter((h) => (h.outstandingPayable || 0) > 0)
    .map((h) => ({
      _id: h._id,
      name: h.name,
      phone: h.phone,
      type: h.type,
      amount: h.outstandingPayable,
    }))
    .sort((a, b) => b.amount - a.amount);

  return { owesMe, iOwe };
}
