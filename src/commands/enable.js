const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'enable',
  description: 'Enable LUX commands and XP gain on a specific channel (Server Owner/Administrator only)',
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
          .setDescription('**Usage:** `X enable #channel_name`\n\n**Examples:**\n• `X enable #general`\n• `X enable LuxChat`\n• `X enable #💰gambling`')
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

      // Check database for disabled channel
      const dbInstance = await db.getDB();
      const disabledChannelsCollection = dbInstance.collection('disabledChannels');

      const disabledChannel = await disabledChannelsCollection.findOne({ 
        channelId: channel.id, 
        guildId: message.guild.id 
      });

      if (!disabledChannel) {
        return await message.reply(`⚠️ Channel ${channel} is not currently disabled. LuxBot is already working normally in this channel.`);
      }

      // Remove channel from disabled list
      await disabledChannelsCollection.deleteOne({
        channelId: channel.id,
        guildId: message.guild.id
      });

      // **🔧 UPDATED: Success embed with server permission info**
      const permissionType = isServerOwner ? 'Server Owner' : 'Administrator';
      
      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Channel Enabled Successfully')
        .setDescription(`LUX commands and XP gain have been **re-enabled** in ${channel}.`)
        .addFields(
          { name: '📍 Channel', value: `${channel} (\`${channel.name}\`)`, inline: true },
          { name: '👑 Enabled By', value: `${message.author} (${permissionType})`, inline: true },
          { name: '📅 Date', value: new Date().toLocaleDateString(), inline: true },
          { name: '✅ Restored Features', value: '• All LUX commands\n• XP gain from messages\n• Full LuxBot functionality', inline: false }
        )
        .setColor('#00FF00')
        .setFooter({ text: 'LuxBot is now fully operational in this channel!' })
        .setTimestamp();

      await message.reply({ embeds: [successEmbed] });

      // **🔧 UPDATED: Log with permission type**
      console.log(`[CHANNEL ENABLED] ${message.author.tag} (${permissionType}) enabled LuxBot in #${channel.name} (${channel.id}) in guild ${message.guild.name}`);

    } catch (error) {
      console.error('Error in enable command:', error);
      await message.reply('❌ An error occurred while enabling the channel. Please try again.');
    }
  },
};
