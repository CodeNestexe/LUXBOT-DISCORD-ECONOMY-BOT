const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'memberinfo',
  description: 'Shows casino member info with ranks (Owner/Admin only)',
  async execute(message, args, db) {
    const userId = message.author.id;

    try {
      // Check if user is part of any casino
      const userCasinoName = await db.getUserCasino(userId);
      
      if (!userCasinoName) {
        return message.reply('❌ You are not part of any casino!');
      }

      // Get casino information
      const casinoInfo = await db.getCasinoInfo(userCasinoName);
      
      if (!casinoInfo) {
        return message.reply('❌ Unable to fetch casino information.');
      }

      // Check if user is owner or admin (co-owner)
      const isOwner = casinoInfo.ownerId === userId;
      const isAdmin = casinoInfo.coOwners && casinoInfo.coOwners.includes(userId);

      if (!isOwner && !isAdmin) {
        return message.reply('❌ **Access Denied!** Only Casino Owner or Admins can use this command.');
      }

      // Build member list with ranks
      const members = casinoInfo.members || [];
      
      if (members.length === 0) {
        return message.reply('❌ No members found in the casino.');
      }

      let ownerList = '';
      let adminList = '';
      let memberList = '';

      // Categorize members by rank
      for (const memberId of members) {
        const memberMention = `<@${memberId}>`;
        
        if (memberId === casinoInfo.ownerId) {
          ownerList += `👑 ${memberMention}\n`;
        } else if (casinoInfo.coOwners && casinoInfo.coOwners.includes(memberId)) {
          adminList += `🔧 ${memberMention}\n`;
        } else {
          memberList += `👤 ${memberMention}\n`;
        }
      }

      // Create comprehensive embed
      const embed = new EmbedBuilder()
        .setTitle(`🏢 ${casinoInfo.name} - Member Directory`)
        .setDescription(`**Total Members:** ${members.length}`)
        .setColor('#800080')
        .setTimestamp()
        .setFooter({ text: 'Casino Management System | LuxBot' });

      // Add owner field
      if (ownerList) {
        embed.addFields({ 
          name: '👑 Owner', 
          value: ownerList, 
          inline: false 
        });
      }

      // Add admins field
      if (adminList) {
        embed.addFields({ 
          name: '🔧 Admins (Co-Owners)', 
          value: adminList, 
          inline: false 
        });
      }

      // Add members field
      if (memberList) {
        embed.addFields({ 
          name: '👤 Members', 
          value: memberList, 
          inline: false 
        });
      }

      // Send DM to the user
      try {
        await message.author.send({ embeds: [embed] });
        
        // Confirmation message in chat
        const confirmEmbed = new EmbedBuilder()
          .setTitle('✅ Member Info Sent!')
          .setDescription(`Member information for **${casinoInfo.name}** has been sent to your DMs.`)
          .setColor('#00FF00')
          .setFooter({ text: 'Check your direct messages' })
          .setTimestamp();

        await message.reply({ embeds: [confirmEmbed] });

      } catch (dmError) {
        console.error('Error sending DM:', dmError);
        
        // If DM fails, send error message
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ DM Failed')
          .setDescription('Unable to send member info to your DMs. Please check your privacy settings and try again.')
          .setColor('#FF0000')
          .setTimestamp();

        await message.reply({ embeds: [errorEmbed] });
      }

    } catch (error) {
      console.error('Error in memberinfo command:', error);
      await message.reply('❌ An error occurred while fetching member information. Please try again later.');
    }
  },
};
