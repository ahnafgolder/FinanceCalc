/** Client-side filter/sort/summary for account holders list. */

export function getHolderBalanceView(h) {
  if (h.type === 'client') {
    const amount = h.outstandingReceivable || 0;
    return {
      amount,
      direction: amount > 0 ? 'owesMe' : 'settled',
    };
  }
  if (h.type === 'vendor') {
    const amount = h.outstandingPayable || 0;
    return {
      amount,
      direction: amount > 0 ? 'iOwe' : 'settled',
    };
  }
  const recv = h.outstandingReceivable || 0;
  const pay = h.outstandingPayable || 0;
  if (recv > pay && recv > 0) {
    return { amount: recv - pay, direction: 'owesMe' };
  }
  if (pay > recv) {
    return { amount: pay - recv, direction: 'iOwe' };
  }
  return { amount: 0, direction: 'settled' };
}

export function computeListSummary(holders) {
  const list = holders || [];
  let totalOwesMe = 0;
  let totalIOwe = 0;
  let overduePeople = 0;

  for (const h of list) {
    totalOwesMe += h.outstandingReceivable || 0;
    totalIOwe += h.outstandingPayable || 0;
    if ((h.overdueCount || 0) > 0) overduePeople += 1;
  }

  return {
    totalOwesMe,
    totalIOwe,
    overduePeople,
    totalPeople: list.length,
  };
}

export function filterHolders(holders, filter) {
  const list = holders || [];
  if (filter === 'all') return list;

  return list.filter((h) => {
    const { direction } = getHolderBalanceView(h);
    if (filter === 'owesMe') return direction === 'owesMe';
    if (filter === 'iOwe') return direction === 'iOwe';
    if (filter === 'settled') return direction === 'settled';
    if (filter === 'overdue') return (h.overdueCount || 0) > 0;
    return true;
  });
}

export function sortHolders(holders, sortBy) {
  const list = [...(holders || [])];

  if (sortBy === 'name') {
    return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  if (sortBy === 'activity') {
    return list.sort((a, b) => {
      const ta = a.lastActivityAt ? new Date(a.lastActivityAt).getTime() : 0;
      const tb = b.lastActivityAt ? new Date(b.lastActivityAt).getTime() : 0;
      return tb - ta;
    });
  }

  if (sortBy === 'due') {
    return list.sort((a, b) => {
      if (!a.nextDueDate && !b.nextDueDate) return 0;
      if (!a.nextDueDate) return 1;
      if (!b.nextDueDate) return -1;
      return new Date(a.nextDueDate) - new Date(b.nextDueDate);
    });
  }

  return list.sort((a, b) => {
    const ba = getHolderBalanceView(a).amount;
    const bb = getHolderBalanceView(b).amount;
    return bb - ba;
  });
}

export function searchHolders(holders, query) {
  const q = query.trim().toLowerCase();
  if (!q) return holders;
  return (holders || []).filter(
    (h) =>
      h.name?.toLowerCase().includes(q) ||
      h.phone?.toLowerCase().includes(q) ||
      h.email?.toLowerCase().includes(q)
  );
}
