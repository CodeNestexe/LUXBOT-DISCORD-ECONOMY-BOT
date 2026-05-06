const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'redeem',
  aliases: ['use', 'claim'],
  async execute(message, args, db) {
    try {
      if (args.length !== 1) {
        return await message.reply('❌ Usage: `X redeem <code>`\nExample: `X redeem PAYDAY`');
      }

      const code = args[0].toUpperCase();
      const userId = message.author.id;

      const dbInstance = await db.getDB();
      const vouchersCollection = dbInstance.collection('vouchers');

      // Find active voucher with the code
      const voucher = await vouchersCollection.findOne({ code, isActive: true });
      
      if (!voucher) {
        return await message.reply('❌ Voucher not found or has expired.');
      }

      // Check if voucher is expired (for 2x type)
      if (voucher.expiresAt && voucher.expiresAt < new Date()) {
        await vouchersCollection.updateOne({ _id: voucher._id }, { $set: { isActive: false } });
        return await message.reply('❌ This voucher has expired.');
      }

      // Check if user limit reached
      if (voucher.redeemedCount >= voucher.limit) {
        await vouchersCollection.updateOne({ _id: voucher._id }, { $set: { isActive: false } });
        return await message.reply('❌ This voucher has reached its redemption limit.');
      }

      // Check if user already redeemed
      if (voucher.redeemedUsers.includes(userId)) {
        return await message.reply('❌ You have already redeemed this voucher.');
      }

      // Redeem voucher
      const newRedeemedCount = voucher.redeemedCount + 1;
      const newRedeemedUsers = [...voucher.redeemedUsers, userId];
      const isNowInactive = newRedeemedCount >= voucher.limit;

      await vouchersCollection.updateOne(
        { _id: voucher._id },
        {
          $set: {
            redeemedCount: newRedeemedCount,
            redeemedUsers: newRedeemedUsers,
            isActive: !isNowInactive
          }
        }
      );

      // Apply voucher effects
      let rewardMessage = '';
      const user = await db.getUser(userId);

      switch (voucher.type) {
        case 'lux':
          const newLuxBalance = (user.balance || 0) + voucher.value;
          await db.updateUser(userId, { balance: newLuxBalance });
          rewardMessage = `💰 **${voucher.value.toLocaleString()}** <:lux:1411637514569252894> has been added to your balance!`;
          break;

        case 'mc':
          const newMcBalance = (user.manaCrystals || 0) + voucher.value;
          await db.updateUser(userId, { manaCrystals: newMcBalance });
          rewardMessage = `💎 **${voucher.value}** <a:crystals:1379010491762081933> has been added to your collection!`;
          break;

        case '2x':
          // Add 2x XP boost for specified duration
          const durationMs = require('ms')(voucher.value);
          const expiresAt = new Date(Date.now() + durationMs);
          
          await db.updateUser(userId, {
            'buffs.levelXpBoost': {
              active: true,
              multiplier: 2,
              startTime: new Date(),
              duration: durationMs,
              expiresAt: expiresAt
            }
          });
          rewardMessage = `🚀 **2x Level XP Boost** activated for **${voucher.value}**!`;
          break;
      }

      // Success embed
      const successEmbed = new EmbedBuilder()
        .setTitle('🎉 Voucher Redeemed Successfully!')
        .setDescription(rewardMessage)
        .addFields(
          { name: '🏷️ Code', value: `\`${voucher.code}\``, inline: true },
          { name: '📦 Type', value: voucher.type === 'lux' ? '💰 LUX Coins' : voucher.type === 'mc' ? '💎 Mana Crystals' : '🚀 2x Level XP Boost', inline: true },
          { name: '👥 Remaining Uses', value: `${voucher.limit - newRedeemedCount}/${voucher.limit}`, inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: 'Thank you for using LuxBot!' })
        .setTimestamp();

      await message.reply({ embeds: [successEmbed] });

      // Log redemption
      console.log(`[VOUCHER REDEEMED] ${message.author.tag} redeemed ${voucher.type} voucher: ${voucher.code} (${newRedeemedCount}/${voucher.limit})`);

    } catch (error) {
      console.error('Error in redeem command:', error);
      await message.reply(`❌ **Error:** ${error.message}`);
    }
  },
};
