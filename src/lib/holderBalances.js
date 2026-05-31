import AccountHolder from '@/models/AccountHolder';
import Bill from '@/models/Bill';
import Payment from '@/models/Payment';

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getHoldersWithBalances(userId) {
  const todayStart = startOfToday();

  const [holders, billsByHolder, paymentsByHolder, openBillStats, lastBillActivity, lastPaymentActivity] =
    await Promise.all([
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

      Bill.aggregate([
        { $match: { userId, status: { $ne: 'paid' } } },
        {
          $group: {
            _id: '$accountHolderId',
            openStatementCount: { $sum: 1 },
            overdueCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ['$dueDate', null] },
                      { $lt: ['$dueDate', todayStart] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
            nextDueDate: { $min: '$dueDate' },
          },
        },
      ]),

      Bill.aggregate([
        { $match: { userId } },
        { $group: { _id: '$accountHolderId', lastAt: { $max: '$createdAt' } } },
      ]),

      Payment.aggregate([
        { $match: { userId } },
        { $group: { _id: '$accountHolderId', lastAt: { $max: '$paymentDate' } } },
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

  const openMap = Object.fromEntries(
    openBillStats.map((r) => [r._id.toString(), r])
  );

  const lastBillMap = Object.fromEntries(
    lastBillActivity.map((r) => [r._id.toString(), r.lastAt])
  );

  const lastPayMap = Object.fromEntries(
    lastPaymentActivity.map((r) => [r._id.toString(), r.lastAt])
  );

  return holders.map((h) => {
    const hid = h._id.toString();
    const totalReceivable = billMap[`${hid}_receivable`] || 0;
    const totalPayable = billMap[`${hid}_payable`] || 0;
    const totalCollected = payMap[`${hid}_received`] || 0;
    const totalPaidOut = payMap[`${hid}_paid`] || 0;
    const totalBilled = totalReceivable + totalPayable;
    const totalPaid = totalCollected + totalPaidOut;

    const open = openMap[hid];
    const billLast = lastBillMap[hid];
    const payLast = lastPayMap[hid];
    let lastActivityAt = null;
    if (billLast && payLast) {
      lastActivityAt = new Date(billLast) > new Date(payLast) ? billLast : payLast;
    } else {
      lastActivityAt = billLast || payLast || null;
    }

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
      openStatementCount: open?.openStatementCount || 0,
      overdueCount: open?.overdueCount || 0,
      nextDueDate: open?.nextDueDate || null,
      lastActivityAt,
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

/** Build summary + open statements for holder detail API. */
export function buildHolderDetailSummary(bills, payments) {
  const todayStart = startOfToday();
  const openBills = bills.filter((b) => b.status !== 'paid');

  let overdueCount = 0;
  let nextDueDate = null;

  for (const b of openBills) {
    if (b.dueDate) {
      const due = new Date(b.dueDate);
      if (due < todayStart) overdueCount += 1;
      if (!nextDueDate || due < new Date(nextDueDate)) {
        nextDueDate = b.dueDate;
      }
    }
  }

  const lastPayment = payments.length
    ? payments.reduce((latest, p) => {
        const d = new Date(p.paymentDate);
        return !latest || d > new Date(latest) ? p.paymentDate : latest;
      }, null)
    : null;

  const openStatements = [...openBills].sort((a, b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  return {
    summary: {
      openCount: openBills.length,
      overdueCount,
      nextDueDate,
      lastPaymentDate: lastPayment,
    },
    openStatements,
  };
}
