const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'removenotifier',
  aliases: ['rn'],
  async execute(message, args, db) {
    try {
      // Check if user has manage channels permission
      if (!message.member.permissions.has('ManageChannels')) {
        return message.reply('❌ You need **Manage Channels** permission to remove stock notifications.');
      }

      if (!args[0]) {
        return message.reply('❌ Usage: `X removenotifier #channel`\nExample: `X removenotifier #stock-alerts`');
      }

      // Parse channel mention
      const channelId = args[0].replace(/[<>#]/g, '');
      const channel = message.guild.channels.cache.get(channelId);

      if (!channel || !channel.isTextBased()) {
        return message.reply('❌ Invalid channel. Please mention a valid text channel.');
      }

      // Remove notification channel from database
      const dbInstance = await db.getDB();
      const notificationsCollection = dbInstance.collection('stockNotifications');
      
      const result = await notificationsCollection.deleteOne({
        guildId: message.guild.id,
        channelId: channel.id
      });

      if (result.deletedCount === 0) {
        return message.reply(`❌ No stock notifications were set up for ${channel}. Use \`X stocknotify #channel\` to enable notifications first.`);
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Stock Notifications Disabled!')
        .setDescription(
          `Stock market events will no longer be sent to ${channel}\n\n` +
          `**To re-enable notifications:**\n` +
          `Use \`X stocknotify ${channel}\``
        )
        .setColor('#FF0000')
        .setFooter({ text: 'Notifications can be re-enabled anytime' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Send confirmation to the removed channel
      setTimeout(async () => {
        const confirmEmbed = new EmbedBuilder()
          .setTitle('📊 Stock Notifications Disabled')
          .setDescription('❌ **Stock market event notifications have been disabled for this channel.**')
          .setColor('#FF0000')
          .setTimestamp();

        await channel.send({ embeds: [confirmEmbed] }).catch(console.error);
      }, 2000);

    } catch (error) {
      console.error('Error in removenotifier command:', error);
      await message.reply('❌ Error removing stock notifications.');
    }
  },
};
