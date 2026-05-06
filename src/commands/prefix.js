module.exports = {
  name: 'prefix',
  description: 'View or change the bot command prefix',
  aliases: [],
  usage: 'prefix [newPrefix]',
  async execute(message, args) {
    const logger = require('../logger');
    const db = require('../database');

    // Permission: allow server admins only
    const isGuildAdmin = message.member && message.member.permissions && message.member.permissions.has && message.member.permissions.has(8);
    if (!isGuildAdmin) {
      return message.reply('❌ You do not have permission to change the server prefix. Server administrators only.');
    }

    // Show current prefix if no args
    if (!args.length) {
      const current = (await db.getGuildPrefix(message.guild.id)) || message.client.prefix;
      return message.reply(`Current server prefix is: **${current}**`);
    }

    const newPrefix = args[0].trim();
    if (newPrefix.length === 0 || newPrefix.length > 3) {
      return message.reply('❌ Prefix must be 1-3 characters long.');
    }

    // Update runtime cache and DB
    try {
      await db.setGuildPrefix(message.guild.id, newPrefix);
      message.client.guildPrefixes.set(message.guild.id, newPrefix);
      logger.success(`Guild ${message.guild.id} prefix set to ${newPrefix}`);
      return message.reply(`✅ Server prefix updated to **${newPrefix}**`);
    } catch (err) {
      logger.error('Failed to set guild prefix: ' + (err && err.message));
      return message.reply('❌ Failed to set server prefix');
    }
  }
};
