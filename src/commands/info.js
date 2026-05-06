const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'info',
  description: 'Displays casino information',
  async execute(message, args, db) {
    console.log(`Received info command: ${message.content}, args: ${args}, db import:`, db ? 'valid' : 'invalid');
    const casinoName = await db.getUserCasino(message.author.id); // Use db.getUserCasino
    if (!casinoName) {
      console.log('User not a member of any casino, replying with error');
      return message.reply('You are not a member of any casino!');
    }

    try {
      const info = await db.getCasinoInfo(casinoName); // Use db.getCasinoInfo
      const embed = new EmbedBuilder()
        .setColor('#800080') // Purple color
        .setTitle('Casino Information')
        .setDescription(`Details for casino **${info.name}**`) // Updated to info.name
        .addFields(
          { name: 'Owner', value: `<@${info.ownerId}>`, inline: true }, // Updated to info.ownerId
          { name: 'Members', value: `${info.members.length}`, inline: true }, // Updated to info.members.length
          { name: 'Rank', value: `#${info.rank}`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });
      await message.reply({ embeds: [embed] });
      console.log(`Displayed info for casino ${casinoName}`);
    } catch (error) {
      console.error(`Error getting casino info: ${error.message}`);
      await message.reply(`Error: ${error.message}`);
    }
  },
};