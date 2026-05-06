const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'stocknotify',
  aliases: ['sn'],
  async execute(message, args, db) {
    try {
      // Check if user has manage channels permission
      if (!message.member.permissions.has('ManageChannels')) {
        return message.reply('❌ You need **Manage Channels** permission to set stock notifications.');
      }

      if (!args[0]) {
        return message.reply('❌ Usage: `X stocknotify #channel`\nExample: `X stocknotify #stock-alerts`');
      }

      // Parse channel mention
      const channelId = args[0].replace(/[<>#]/g, '');
      const channel = message.guild.channels.cache.get(channelId);

      if (!channel || !channel.isTextBased()) {
        return message.reply('❌ Invalid channel. Please mention a valid text channel.');
      }

      // Check bot permissions in target channel
      const permissions = channel.permissionsFor(message.guild.members.me);
      if (!permissions.has('SendMessages') || !permissions.has('ViewChannel')) {
        return message.reply(`❌ I don't have permission to send messages in ${channel}. Please check my permissions.`);
      }

      // Save notification channel to database
      const dbInstance = await db.getDB();
      const notificationsCollection = dbInstance.collection('stockNotifications');
      
      await notificationsCollection.updateOne(
        { guildId: message.guild.id },
        { 
          $set: { 
            channelId: channel.id,
            channelName: channel.name,
            guildName: message.guild.name,
            setupBy: message.author.id,
            setupAt: new Date()
          }
        },
        { upsert: true }
      );

      const embed = new EmbedBuilder()
        .setTitle('✅ Stock Notifications Enabled!')
        .setDescription(
          `Stock market events will now be sent to ${channel}\n\n` +
          `**Event Types:**\n` +
          `🚀 Bull Runs & Market Rallies\n` +
          `📉 Market Dumps & Crashes\n` +
          `📊 Earnings Reports\n` +
          `🤝 Partnership Announcements\n` +
          `🌊 Economic Events`
        )
        .setColor('#00FFFF')
        .setFooter({ text: 'Stock events update every 5 minutes' })
        .setTimestamp();

      await message.reply({ embeds: [embed] });

      // Send test notification to confirm setup
      setTimeout(async () => {
        const testEmbed = new EmbedBuilder()
          .setTitle('📊 Stock Notification System')
          .setDescription('✅ **Setup Complete!** You will receive stock market event notifications here.')
          .setColor('#00FF00')
          .setTimestamp();

        await channel.send({ embeds: [testEmbed] }).catch(console.error);
      }, 2000);

    } catch (error) {
      console.error('Error in stocknotify command:', error);
      await message.reply('❌ Error setting up stock notifications.');
    }
  },
};
