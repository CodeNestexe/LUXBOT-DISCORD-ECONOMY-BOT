const { PermissionsBitField } = require('discord.js');

// **SHARED: Single bannedUsers Map for all ban operations**
const bannedUsers = new Map();

// Duration parser
function parseDuration(durationStr) {
  if (!durationStr) return Infinity;
  const match = durationStr.match(/(\d+)([dhm])/);
  if (!match) return Infinity;
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 'd': return value * 24 * 60 * 60 * 1000; // days
    case 'h': return value * 60 * 60 * 1000; // hours
    case 'm': return value * 60 * 1000; // minutes
    default: return Infinity;
  }
}

module.exports = {
  // **BAN COMMAND**
  name: 'ban',
  aliases: [],
  description: 'Ban a user from using Lux Bot (Admin Only)',
  adminOnly: true,
  
  async execute(message, args, db) {
    // Check admin permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return; // Silent return
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return; // Silent return if no user mentioned
    }

    const duration = args[1]; // Optional duration
    const reason = args.slice(2).join(' ') || 'No reason provided';

    // **FIXED: Add user to shared bannedUsers Map**
    bannedUsers.set(targetUser.id, {
      bannedBy: message.author.id,
      reason: reason,
      bannedAt: Date.now(),
      duration: duration ? parseDuration(duration) : Infinity,
      durationStr: duration || 'Permanent'
    });

    // Send DM to banned user
    try {
      await targetUser.send(
        `You are banned by admin for ${reason}\n${duration || 'Permanent'}`
      );
    } catch (error) {
      console.log(`Could not DM banned user ${targetUser.id}`);
    }

    // No response in channel
  },

  // **UNBAN FUNCTION (within same module)**
  async executeUnban(message, args, db) {
    // Check admin permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return; // Silent return
    }

    const targetUser = message.mentions.users.first();
    if (!targetUser) {
      return; // Silent return if no user mentioned
    }

    // Check if user is actually banned
    if (!bannedUsers.has(targetUser.id)) {
      return; // Silent return if user isn't banned
    }

    const reason = args.slice(1).join(' ') || 'No reason provided';

    // **FIXED: Remove from shared bannedUsers Map**
    bannedUsers.delete(targetUser.id);

    // Send DM to unbanned user
    try {
      await targetUser.send(
        `You are unbanned by admin\n${reason}`
      );
    } catch (error) {
      console.log(`Could not DM unbanned user ${targetUser.id}`);
    }

    // No response in channel
  },

  // **CHECK BAN STATUS**
  isBanned(userId) {
    const banInfo = bannedUsers.get(userId);
    if (!banInfo) return false;

    // Check if temporary ban has expired
    if (banInfo.duration !== Infinity) {
      if (Date.now() - banInfo.bannedAt > banInfo.duration) {
        bannedUsers.delete(userId);
        return false;
      }
    }

    return true;
  },

  // Get ban info
  getBanInfo(userId) {
    return bannedUsers.get(userId);
  },

  // Export the bannedUsers Map for external access
  bannedUsers
};
