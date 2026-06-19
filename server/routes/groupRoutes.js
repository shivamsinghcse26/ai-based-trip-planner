const express = require('express');

const User = require('../models/User');
const Group = require('../models/Group');
const { requireAuth } = require('../middleware/auth');
const { assertUserIsGroupMember } = require('../utils/ownership');

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  const groups = await Group.find({ members: req.user.userId }).sort({ createdAt: -1 });
  return res.json({
    groups: groups.map((g) => ({
      id: g._id.toString(),
      groupName: g.groupName,
    })),
  });
});

router.post('/', requireAuth, async (req, res) => {
  const { groupName } = req.body || {};
  if (!groupName) return res.status(400).json({ message: 'groupName is required' });

  const group = await Group.create({
    groupName: String(groupName).trim(),
    createdBy: req.user.userId,
    members: [req.user.userId],
  });

  return res.status(201).json({
    id: group._id.toString(),
    groupName: group.groupName,
    members: group.members.map((m) => m.toString()),
  });
});

router.post('/:groupId/members', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ message: 'email is required' });

  await assertUserIsGroupMember({ userId: req.user.userId, groupId });

  const member = await User.findOne({ email: String(email).toLowerCase() });
  if (!member) return res.status(404).json({ message: 'User with that email not found' });

  await Group.updateOne(
    { _id: groupId },
    { $addToSet: { members: member._id } },
  );

  return res.json({ message: 'Member added' });
});

router.get('/:groupId', requireAuth, async (req, res) => {
  const { groupId } = req.params;
  const group = await assertUserIsGroupMember({ userId: req.user.userId, groupId });

  const members = await User.find({ _id: { $in: group.members } }).select('name email');

  return res.json({
    id: group._id.toString(),
    groupName: group.groupName,
    createdBy: group.createdBy.toString(),
    members: members.map((m) => ({ id: m._id.toString(), name: m.name, email: m.email })),
  });
});

module.exports = router;

