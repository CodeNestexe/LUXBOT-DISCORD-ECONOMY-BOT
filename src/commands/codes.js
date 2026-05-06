// /home/container/src/commands/codes.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'codes',
  aliases: [],
  async execute(message, args, db) {
    try {
      // Check if the user is an admin or bot owner
      const adminIds = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => id.trim()) : [];
      const ownerId = process.env.BOT_OWNER_ID ? process.env.BOT_OWNER_ID.toString().trim() : '';
      const userId = message.author.id.toString().trim();
      console.log(`Admin check for user ${userId}:`, {
        adminIds,
        ownerId,
        userId,
        userIdType: typeof userId,
        ownerIdType: typeof ownerId,
        adminIdsType: typeof adminIds,
        isAdmin: adminIds.includes(userId),
        isOwner: userId === ownerId,
        rawComparison: `${userId} === ${ownerId} ? ${userId === ownerId}`
      });
      if (!adminIds.includes(userId) && userId !== ownerId) {
        return await message.reply('This command is only for admins and the bot owner.');
      }

      if (args.length !== 1 || args[0].toLowerCase() !== 'list') {
        return await message.reply('Usage: `X codes list`');
      }

      const dbInstance = await db.getDB(); // Get the MongoDB database instance
      const vouchersCollection = dbInstance.collection('vouchers');
      const vouchers = await vouchersCollection.find().toArray();

      if (vouchers.length === 0) {
        return await message.reply('No vouchers found.');
      }

      // Update status of expired vouchers
      const now = new Date();
      for (const voucher of vouchers) {
        if (voucher.isActive && voucher.expiresAt && now > new Date(voucher.expiresAt)) {
          await vouchersCollection.updateOne({ code: voucher.code }, { $set: { isActive: false } });
          voucher.isActive = false;
        }
      }

      const embed = new EmbedBuilder()
        .setTitle('📜 Voucher Codes List')
        .setDescription(
          vouchers
            .map(voucher => `**${voucher.code}** - ${voucher.isActive ? 'ACTIVE 🟢' : 'EXPIRED 🔴'}`)
            .join('\n')
        )
        .setColor('#00ff00')
        .setFooter({ text: `Total Codes: ${vouchers.length}` });

      await message.reply({ embeds: [embed] });

    } catch (error) {
      console.error('Error in codes command:', error);
      await message.reply(`Error: ${error.message}`);
    }
  },
};