// /home/container/src/commands/kill.js
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'kill',
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

      if (args.length !== 1) {
        return await message.reply('Usage: `X kill {code_name}` (e.g., `X kill TEST`)');
      }

      const code = args[0].toUpperCase();
      const dbInstance = await db.getDB(); // Get the MongoDB database instance
      const vouchersCollection = dbInstance.collection('vouchers');
      const voucher = await vouchersCollection.findOne({ code });

      if (!voucher) {
        return await message.reply(`No voucher found with code \`${code}\`.`);
      }

      if (!voucher.isActive) {
        return await message.reply(`The voucher \`${code}\` is already expired.`);
      }

      // Expire the voucher
      await vouchersCollection.updateOne({ code }, { $set: { isActive: false } });

      const embed = new EmbedBuilder()
        .setTitle('Voucher Expired')
        .setDescription(`The voucher \`${code}\` has been successfully expired. Users can no longer redeem it.`)
        .setColor('#ff0000');

      await message.reply({ embeds: [embed] });

      // Notify users who have the 2x boost active
      if (voucher.type === '2x') {
        const usersCollection = dbInstance.collection('battle');
        const usersWithBoost = await usersCollection.find({
          'battleStats.activeBoosts.code': code,
        }).toArray();

        for (const user of usersWithBoost) {
          const discordUser = await message.client.users.fetch(user.userId).catch(() => null);
          if (discordUser) {
            await discordUser.send(`YOUR CODE \`${code}\` IS EXPIRED`).catch(() => {});
          }
          // Remove the boost from the user's activeBoosts
          await usersCollection.updateOne(
            { userId: user.userId },
            { $pull: { 'battleStats.activeBoosts': { code } } }
          );
        }
      }

    } catch (error) {
      console.error('Error in kill command:', error);
      await message.reply(`Error: ${error.message}`);
    }
  },
};