const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'admin',
  description: 'Admin commands for bot management',
  async execute(message, args, db) {
    try {
      // Get admin/owner IDs from your specific environment variables
      const BOT_OWNER_ID = process.env.BOT_OWNER_ID; // 719050043855863839
      const ADMIN_IDS = process.env.ADMIN_IDS; // 1270319823930396805

      const authorId = message.author.id;
      let isAuthorized = false;

      // Check if user is bot owner
      if (BOT_OWNER_ID && authorId === BOT_OWNER_ID.trim()) {
        isAuthorized = true;
      }

      // Check if user is in admin list
      if (ADMIN_IDS && !isAuthorized) {
        const adminList = ADMIN_IDS.split(',').map(id => id.trim());
        if (adminList.includes(authorId)) {
          isAuthorized = true;
        }
      }

      // Unauthorized access
      if (!isAuthorized) {
        return message.reply('🚫 **Access Denied!** You do not have permission to use admin commands.');
      }

      // Check command format: X admin addlux {amount} {@user}
      if (args.length < 3 || args[0].toLowerCase() !== 'addlux') {
        const helpEmbed = new EmbedBuilder()
          .setTitle('🛡️ Admin Commands')
          .setDescription('**Available Commands:**\n• `X admin addlux {amount} @user` - Add LUX to a user')
          .addFields(
            { name: 'Example', value: '`X admin addlux 50000 @user123`', inline: false },
            { name: 'Note', value: 'This bypasses all limits and does not deduct from your balance.', inline: false }
          )
          .setColor('#FF6B35')
          .setTimestamp();

        return message.reply({ embeds: [helpEmbed] });
      }

      // Parse amount
      const amount = parseInt(args[1]);
      if (isNaN(amount) || amount <= 0) {
        return message.reply('❌ Invalid amount! Please provide a positive number.');
      }

      // Get target user
      const targetUser = message.mentions.users.first();
      if (!targetUser) {
        return message.reply('❌ Please mention a valid user!');
      }

      if (targetUser.bot) {
        return message.reply('❌ Cannot add LUX to bots!');
      }

      // Get user data from database
      const userData = await db.getUser(targetUser.id);
      if (!userData) {
        return message.reply('❌ User not found in database!');
      }

      // Calculate new balance
      const oldBalance = userData.balance || 0;
      const newBalance = oldBalance + amount;

      // Update user balance (bypasses all limits)
      await db.updateUser(targetUser.id, { balance: newBalance });

      // Create success embed for channel
      const channelEmbed = new EmbedBuilder()
        .setTitle('🛡️ Admin Action: LUX Added')
        .setDescription(`Successfully added **${amount.toLocaleString()}** <:lux:1411637514569252894> to ${targetUser}`)
        .addFields(
          { name: '👑 Admin', value: `${message.author}`, inline: true },
          { name: '👤 Recipient', value: `${targetUser}`, inline: true },
          { name: '💰 Amount Added', value: `${amount.toLocaleString()} <:lux:1411637514569252894>`, inline: true },
          { name: '📊 Previous Balance', value: `${oldBalance.toLocaleString()} <:lux:1411637514569252894>`, inline: true },
          { name: '📈 New Balance', value: `${newBalance.toLocaleString()} <:lux:1411637514569252894>`, inline: true },
          { name: '⚡ Status', value: 'Bypassed all limits', inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: 'Admin Command Executed' })
        .setTimestamp();

      // **NEW: Create same embed for user's DM**
      const dmEmbed = new EmbedBuilder()
        .setTitle('🎁 You Received LUX from Admin!')
        .setDescription(`An admin has credited **${amount.toLocaleString()}** <:lux:1411637514569252894> to your account!`)
        .addFields(
          { name: '👑 Admin', value: `${message.author.tag}`, inline: true },
          { name: '👤 Recipient', value: `${targetUser.tag}`, inline: true },
          { name: '💰 Amount Received', value: `${amount.toLocaleString()} <:lux:1411637514569252894>`, inline: true },
          { name: '📊 Previous Balance', value: `${oldBalance.toLocaleString()} <:lux:1411637514569252894>`, inline: true },
          { name: '📈 New Balance', value: `${newBalance.toLocaleString()} <:lux:1411637514569252894>`, inline: true },
          { name: '⚡ Status', value: 'All limits bypassed - No restrictions applied', inline: true }
        )
        .setColor('#00FF00')
        .setFooter({ text: 'LuxBot Admin Transaction | Enjoy your LUX!' })
        .setTimestamp();

      // Send reply in channel
      await message.reply({ embeds: [channelEmbed] });

      // **NEW: Send same detailed embed to user's DM**
      try {
        await targetUser.send({ embeds: [dmEmbed] });
        console.log(`[ADMIN DM] Successfully sent LUX notification DM to ${targetUser.tag} (${targetUser.id})`);
      } catch (dmError) {
        console.error(`[ADMIN DM] Could not send DM to ${targetUser.tag}:`, dmError.message);
        
        // Send follow-up message in channel if DM fails
        const dmFailEmbed = new EmbedBuilder()
          .setTitle('⚠️ DM Delivery Failed')
          .setDescription(`Could not send notification DM to ${targetUser}. They may have DMs disabled.`)
          .setColor('#FFA500')
          .setFooter({ text: 'User still received the LUX' })
          .setTimestamp();
        
        await message.followUp({ embeds: [dmFailEmbed] });
      }

      // Log the admin action
      console.log(`[ADMIN] ${message.author.tag} (${message.author.id}) added ${amount} LUX to ${targetUser.tag} (${targetUser.id})`);

    } catch (error) {
      console.error('Error in admin command:', error);
      await message.reply(`❌ **Error:** ${error.message}`);
    }
  },
};
