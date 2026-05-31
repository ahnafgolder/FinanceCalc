/** Build a chronological passbook ledger from bills and payments. */
export function buildLedger(bills = [], payments = [], holderType = 'client') {
  const entries = [
    ...bills.map((b) => ({
      id: b._id,
      kind: 'bill',
      date: b.createdAt,
      billNumber: b.billNumber,
      description: b.description,
      amount: b.totalAmount,
      billType: b.type,
      status: b.status,
      dueDate: b.dueDate,
    })),
    ...payments.map((p) => ({
      id: p._id,
      kind: 'payment',
      date: p.paymentDate,
      billNumber: p.billId?.billNumber,
      description: p.note,
      amount: p.amount,
      paymentType: p.type,
      method: p.paymentMethod,
      reference: p.referenceNumber,
    })),
  ].sort((a, b) => new Date(a.date) - new Date(b.date));

  let balance = 0;
  for (const entry of entries) {
    if (entry.kind === 'bill') {
      if (entry.billType === 'receivable') balance += entry.amount;
      else balance -= entry.amount;
    } else if (entry.paymentType === 'received') {
      balance -= entry.amount;
    } else {
      balance += entry.amount;
    }
    entry.balance = balance;
  }

  entries.reverse();

  const primaryOutstanding =
    holderType === 'vendor'
      ? Math.max(0, -balance)
      : holderType === 'client'
        ? Math.max(0, balance)
        : balance;

  return { entries, netBalance: balance, primaryOutstanding };
}

export function getPrimaryOutstanding(data) {
  const h = data?.holder;
  if (!h) return { amount: 0, direction: 'settled' };

  if (h.type === 'client') {
    return {
      amount: data.outstandingReceivable || 0,
      direction: (data.outstandingReceivable || 0) > 0 ? 'owesMe' : 'settled',
    };
  }
  if (h.type === 'vendor') {
    return {
      amount: data.outstandingPayable || 0,
      direction: (data.outstandingPayable || 0) > 0 ? 'iOwe' : 'settled',
    };
  }

  const recv = data.outstandingReceivable || 0;
  const pay = data.outstandingPayable || 0;
  if (recv >= pay && recv > 0) return { amount: recv - pay, direction: 'owesMe' };
  if (pay > recv) return { amount: pay - recv, direction: 'iOwe' };
  return { amount: 0, direction: 'settled' };
}

export function buildWhatsAppStatement({
  holderName,
  phone,
  outstandingReceivable,
  outstandingPayable,
  holderType,
  totalCollected,
  totalPaidOut,
  fmt,
  fmtDate,
  lang,
}) {
  const today = fmtDate(new Date());
  const lines =
    lang === 'bn'
      ? [
          `*FinanceCalc হিসাব*`,
          `নাম: ${holderName}`,
          `তারিখ: ${today}`,
          '',
        ]
      : [
          `*FinanceCalc Statement*`,
          `Name: ${holderName}`,
          `Date: ${today}`,
          '',
        ];

  if (holderType === 'client' || holderType === 'both') {
    lines.push(
      lang === 'bn'
        ? `আপনার বাকি (আমার পাওনা): *${fmt(outstandingReceivable || 0)}*`
        : `You owe (Receivable): *${fmt(outstandingReceivable || 0)}*`
    );
  }
  if (holderType === 'vendor' || holderType === 'both') {
    lines.push(
      lang === 'bn'
        ? `আমার বাকি (আপনাকে দিতে হবে): *${fmt(outstandingPayable || 0)}*`
        : `I owe (Payable): *${fmt(outstandingPayable || 0)}*`
    );
  }

  if (totalCollected || totalPaidOut) {
    lines.push('');
    if (totalCollected) {
      lines.push(
        lang === 'bn'
          ? `মোট গ্রহণ: ${fmt(totalCollected)}`
          : `Total received: ${fmt(totalCollected)}`
      );
    }
    if (totalPaidOut) {
      lines.push(
        lang === 'bn'
          ? `মোট প্রদান: ${fmt(totalPaidOut)}`
          : `Total paid: ${fmt(totalPaidOut)}`
      );
    }
  }

  lines.push('');
  lines.push(lang === 'bn' ? '— FinanceCalc' : '— FinanceCalc');

  const text = encodeURIComponent(lines.join('\n'));
  const digits = (phone || '').replace(/\D/g, '');
  const normalized = digits.startsWith('880') ? digits : digits.startsWith('0') ? `88${digits}` : digits ? `880${digits}` : '';

  if (normalized.length >= 11) {
    return `https://wa.me/${normalized}?text=${text}`;
  }
  return `https://wa.me/?text=${text}`;
}

export function openWhatsAppShare(url) {
  window.open(url, '_blank', 'noopener,noreferrer');
}
