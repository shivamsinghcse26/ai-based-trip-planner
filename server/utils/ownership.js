const Group = require('../models/Group');

async function assertUserIsGroupMember({ userId, groupId }) {
  const group = await Group.findById(groupId);
  if (!group) {
    const err = new Error('Group not found');
    err.status = 404;
    throw err;
  }

  const isMember = group.members.some((id) => id.toString() === userId);
  if (!isMember) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }

  return group;
}

module.exports = { assertUserIsGroupMember };

