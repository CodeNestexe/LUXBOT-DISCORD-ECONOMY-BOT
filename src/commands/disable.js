const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'disable',
  description: 'Disable LUX commands and XP gain on a specific channel (Server Owner/Administrator only)',
  async execute(message, args, db) {
    try {
      // **🔧 FIXED: Check for SERVER permissions only (not global bot permissions)**
      const isServerOwner = message.guild.ownerId === message.author.id;
      const hasAdminPermission = message.member.permissions.has(PermissionsBitField.Flags.Administrator);

      if (!isServerOwner && !hasAdminPermission) {
        return await message.reply('🚫 **Access Denied!** Only server owners and users with Administrator permission can use this command.');
      }

      if (args.length !== 1) {
        const helpEmbed = new EmbedBuilder()
          .setTitle('❌ Invalid Usage')
          .setDescription('**Usage:** `X disable #channel_name`\n\n**Examples:**\n• `X disable #general`\n• `X disable LuxChat`\n• `X disable #💰gambling`')
          .setColor('#FF6B35')
          .setFooter({ text: 'You can use channel mention or channel name' })
          .setTimestamp();

        return await message.reply({ embeds: [helpEmbed] });
      }

      let channelNameOrId = args[0];
      let channel = null;

      // Check if it's a channel mention
      if (message.mentions.channels.size > 0) {
        channel = message.mentions.channels.first();
      } else {
        // Try to find by channel name (with or without #)
        const channelName = channelNameOrId.replace('#', '');
        channel = message.guild.channels.cache.find(c => 
          c.name.toLowerCase() === channelName.toLowerCase()
        );
      }

      if (!channel) {
        return await message.reply('❌ **Channel not found!** Please make sure the channel exists in this server.');
      }

      // Check database for existing disabled channel
      const dbInstance = await db.getDB();
      const disabledChannelsCollection = dbInstance.collection('disabledChannels');

      const existingDisabled = await disabledChannelsCollection.findOne({ 
        channelId: channel.id, 
        guildId: message.guild.id 
      });

      if (existingDisabled) {
        return await message.reply(`⚠️ Channel ${channel} is already disabled for LUX commands and XP gain.`);
      }

      // Add channel to disabled list
      await disabledChannelsCollection.insertOne({
        channelId: channel.id,
        guildId: message.guild.id,
        channelName: channel.name,
        disabledBy: message.author.id,
        disabledAt: new Date()
      });

      // **🔧 UPDATED: Success embed with server permission info**
      const permissionType = isServerOwner ? 'Server Owner' : 'Administrator';
      
      const successEmbed = new EmbedBuilder()
        .setTitle('🚫 Channel Disabled Successfully')
        .setDescription(`LUX commands and XP gain have been **disabled** in ${channel}.`)
        .addFields(
          { name: '📍 Channel', value: `${channel} (\`${channel.name}\`)`, inline: true },
          { name: '👑 Disabled By', value: `${message.author} (${permissionType})`, inline: true },
          { name: '📅 Date', value: new Date().toLocaleDateString(), inline: true },
          { name: '🚫 Restrictions', value: '• No LUX commands\n• No XP gain from messages\n• All LuxBot features blocked', inline: false }
        )
        .setColor('#FF0000')
        .setFooter({ text: 'Use "X enable #channel" to re-enable LuxBot in this channel' })
        .setTimestamp();

      await message.reply({ embeds: [successEmbed] });

      // **🔧 UPDATED: Log with permission type**
      console.log(`[CHANNEL DISABLED] ${message.author.tag} (${permissionType}) disabled LuxBot in #${channel.name} (${channel.id}) in guild ${message.guild.name}`);

    } catch (error) {
      console.error('Error in disable command:', error);
      await message.reply('❌ An error occurred while disabling the channel. Please try again.');
    }
  },
};
