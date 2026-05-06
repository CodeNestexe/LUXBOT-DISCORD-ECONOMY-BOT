const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'bank',
  description: 'Displays the current bank balance of the casino',
  async execute(message, args, db) {
    console.log(`Received bank command: ${message.content}, args: ${args}`);
    const userId = message.author.id;

    try {
      // Check if the user is a member of a casino using the new function
      const casinoName = await db.getUserCasino(userId);
      if (!casinoName) {
        console.log(`User ${userId} is not a member of any casino`);
        return message.reply('You must be a member of a casino to view its bank balance!');
      }

      // Use getCasinoInfo to get all details, including the rank
      const casinoInfo = await db.getCasinoInfo(casinoName);

      const bankEmbed = new EmbedBuilder()
        .setColor('#FFD700') // Gold color for bank
        .setTitle(`Bank Balance - ${casinoName}`)
        .addFields(
          { name: 'Bank Balance', value: `${casinoInfo.bankBalance} LUX`, inline: true },
          { name: 'Rank', value: `#${casinoInfo.rank} of ${casinoInfo.totalCasinos} Casinos`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });

      await message.reply({ embeds: [bankEmbed] });
    } catch (error) {
      console.error(`Error in bank command: ${error.message}`);
      await message.reply(`Error: ${error.message}`);
    }
  },
};