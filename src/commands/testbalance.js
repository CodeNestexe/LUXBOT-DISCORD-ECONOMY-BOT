const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'testbalance',
  aliases: ['tb'],
  async execute(message, args, db) {
    try {
      const user = await db.getUser(message.author.id);
      
      const embed = new EmbedBuilder()
        .setTitle('🐛 Debug: User Balance')
        .setDescription(
          `**User ID:** ${message.author.id}\n` +
          `**Balance:** ${user?.balance || 'undefined'} LUX\n` +
          `**Registered:** ${user?.registered || 'false'}\n` +
          `**TOS Accepted:** ${user?.tosAccepted || 'false'}\n` +
          `**Created At:** ${user?.createdAt || 'undefined'}\n` +
          `**User Exists:** ${user ? 'Yes' : 'No'}`
        )
        .setColor('#00FFFF')
        .setTimestamp();
        
      await message.reply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Error in testbalance:', error);
      await message.reply('❌ Error checking balance.');
    }
  }
};
