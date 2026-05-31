/** Advance the next installment due date after a payment is recorded. */
export function advanceNextDueDate(current, frequency) {
  if (!current || frequency === 'flexible') return current;
  const next = new Date(current);
  if (frequency === 'weekly') next.setDate(next.getDate() + 7);
  else if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
  return next;
}

export function suggestPaymentAmount(bill, remaining) {
  if (bill?.installmentAmount && bill.installmentAmount > 0) {
    return Math.min(bill.installmentAmount, remaining);
  }
  return remaining;
}

export function isLoanRecord(bill) {
  return bill?.category === 'loan';
}
