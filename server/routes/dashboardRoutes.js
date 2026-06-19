const express = require('express');

const Expense = require('../models/Expense');
const Group = require('../models/Group');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function computeTotalsForUser({ userId, groupIds, expenses }) {
  // Similar approach: for each expense, compute net changes per member.
  const balances = new Map();
  for (const gid of groupIds) {
    // noop; balances are per-user overall, not per-group
  }

  let totalToReceive = 0;
  let totalOwed = 0;

  const myId = userId.toString();

  for (const exp of expenses) {
    const split = exp.splitBetween.map((x) => x.toString());
    const share = split.length ? exp.amount / split.length : 0;
    const paidBy = exp.paidBy.toString();

    // Net for myId:
    // If I'm paidBy: I receive share from each split member.
    // If I'm in split: I owe share.
    // If both, net includes both effects.
    let net = 0;
    if (myId === paidBy) {
      net += share * split.length;
      net -= exp.amount; // payer paid exp.amount; after cancel, net is 0 if split includes payer equally
      // Easier: use explicit method:
    }

    // Explicit method:
    if (myId === paidBy) {
      net = 0;
      // payer gains share from each other split member
      net += share * split.length;
    }
    if (split.includes(myId)) {
      net -= share;
    }

    // The explicit method above double counts payer if payer also in split (which it is, because usually members include payer).
    // We'll correct by using balances algorithm from expenseRoutes.
  }

  // Use balances algorithm precisely
  // We'll compute net per member using Map, then pick my net.
  const memberSet = new Set();
  for (const gId of groupIds) {
    // members are not loaded; so we approximate using expenses' splitBetween and paidBy
  }

  const netByUser = new Map();

  for (const exp of expenses) {
    const splitBetween = exp.splitBetween.map((x) => x.toString());
    const share = splitBetween.length ? exp.amount / splitBetween.length : 0;
    const paidBy = exp.paidBy.toString();

    for (const m of splitBetween) {
      netByUser.set(m, (netByUser.get(m) || 0) - share);
      netByUser.set(paidBy, (netByUser.get(paidBy) || 0) + share);
    }
  }

  const myNet = netByUser.get(myId) || 0;

  if (myNet > 0) totalToReceive = myNet;
  if (myNet < 0) totalOwed = -myNet;

  // total to receive / owed for the whole dashboard is requested as totals, but unclear.
  // We'll interpret as user's totals.
  const totalBalance = Number((totalToReceive - totalOwed).toFixed(2));

  return { totalBalance, totalToReceive: Number(totalToReceive.toFixed(2)), totalOwed: Number(totalOwed.toFixed(2)) };
}

router.get('/', requireAuth, async (req, res) => {
  const userId = req.user.userId.toString();

  const groups = await Group.find({ members: userId }).select('_id');
  const groupIds = groups.map((g) => g._id);

  const expenses = await Expense.find({ groupId: { $in: groupIds } });

  const { totalBalance, totalToReceive, totalOwed } = computeTotalsForUser({
    userId,
    groupIds,
    expenses,
  });

  return res.json({
    userId,
    totalBalance,
    totalOwed,
    totalToReceive,
  });
});

module.exports = router;

