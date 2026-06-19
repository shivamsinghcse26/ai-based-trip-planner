const express = require('express');

const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { requireAuth } = require('../middleware/auth');
const { assertUserIsGroupMember } = require('../utils/ownership');

const router = express.Router();

function computeBalances({ expenses, memberIds, paidByField = 'paidBy' }) {
  // Net balance: positive => is owed, negative => owes (for the user itself).
  // We'll compute owed/owed-to-me style at API layer.
  const balances = new Map();
  for (const id of memberIds) balances.set(id.toString(), 0);

  for (const exp of expenses) {
    const splitBetween = exp.splitBetween.map((x) => x.toString());
    const share = splitBetween.length ? exp.amount / splitBetween.length : 0;

    const paidBy = exp[paidByField].toString();

    // payer paid whole amount -> should receive the shares from others.
    balances.set(paidBy, balances.get(paidBy) + exp.amount - share * splitBetween.length);

    // But above cancels; better to do explicit:
    // Each splitBetween member owes their share to payer.
    // So each member's net decreases by share, payer increases by share per member.
    for (const m of splitBetween) {
      balances.set(m, balances.get(m) - share);
      balances.set(paidBy, balances.get(paidBy) + share);
    }
  }

  return balances;
}

router.post('/:groupId/expenses', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const { description, amount, paidBy, splitBetween } = req.body || {};

  await assertUserIsGroupMember({ userId: req.user.userId, groupId });

  if (!description || typeof amount !== 'number') {
    return res.status(400).json({ message: 'description and numeric amount are required' });
  }

  const group = await Group.findById(groupId);

  const payerId = paidBy || req.user.userId;
  if (!group.members.some((m) => m.toString() === String(payerId))) {
    return res.status(400).json({ message: 'paidBy must be a group member' });
  }

  const split = Array.isArray(splitBetween) ? splitBetween : [];
  const uniqueSplit = [...new Set(split.map(String))];
  if (uniqueSplit.length === 0) {
    return res.status(400).json({ message: 'splitBetween must include at least 1 member' });
  }

  for (const uid of uniqueSplit) {
    if (!group.members.some((m) => m.toString() === uid)) {
      return res.status(400).json({ message: 'splitBetween must be group members' });
    }
  }

  const expense = await Expense.create({
    groupId,
    description: String(description).trim(),
    amount,
    paidBy: payerId,
    splitBetween: uniqueSplit,
  });

  return res.status(201).json({
    id: expense._id.toString(),
  });
});

router.get('/:groupId/expenses', requireAuth, async (req, res) => {
  const { groupId } = req.params;

  const group = await assertUserIsGroupMember({ userId: req.user.userId, groupId });

  const expenses = await Expense.find({ groupId })
    .sort({ createdAt: -1 })
    .populate('paidBy', 'name email')
    .populate('splitBetween', 'name email');

  return res.json({
    expenses: expenses.map((e) => ({
      id: e._id.toString(),
      description: e.description,
      amount: e.amount,
      paidBy: e.paidBy?.id ? e.paidBy.id : e.paidBy,
      splitBetween: e.splitBetween.map((u) => ({
        id: u._id?.toString ? u._id.toString() : u.toString(),
        name: u.name,
        email: u.email,
      })),
      createdAt: e.createdAt,
    })),
  });
});

router.get('/:groupId/balances', requireAuth, async (req, res) => {
  const { groupId } = req.params;

  const group = await assertUserIsGroupMember({ userId: req.user.userId, groupId });

  const expenses = await Expense.find({ groupId });

  const memberIds = group.members.map((id) => id.toString());
  const balances = computeBalances({ expenses, memberIds });

  // For current user: positive => to receive, negative => owes.
  const myBal = balances.get(req.user.userId.toString()) || 0;

  const owedToOthers = memberIds
    .filter((id) => id !== req.user.userId.toString())
    .map((id) => ({
      memberId: id,
      net: balances.get(id) || 0,
    }));

  // Compute simple totals
  let totalToReceive = 0;
  let totalOwed = 0;
  for (const [_, net] of balances.entries()) {
    if (net > 0) totalToReceive += net;
    if (net < 0) totalOwed += -net;
  }

  return res.json({
    myBalance: myBal,
    totalToReceive: Number(totalToReceive.toFixed(2)),
    totalOwed: Number(totalOwed.toFixed(2)),
    balances: Object.fromEntries(
      [...balances.entries()].map(([k, v]) => [k, Number(v.toFixed(2))]),
    ),
  });
});

module.exports = router;

