const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'manacrystals',
  aliases: ['mc', 'crystals'],
  description: 'Check your total Mana Crystals',
  async execute(message, args, db) {
    try {
      const userId = message.author.id;
      const user = await db.getUser(userId);

      if (!user) {
        return message.reply('❌ Please accept the Terms of Service first!');
      }

      const manaCrystals = user.manaCrystals || 0;

      const embed = new EmbedBuilder()
        .setTitle('💎 Mana Crystals Balance')
        .setDescription(`Welcome, ${message.author.username}! Check your shining Mana Crystals <a:crystals:1379010491762081933>!`)
        .addFields(
          {
            name: '💎 Total Mana Crystals',
            value: `${manaCrystals.toLocaleString()} <a:crystals:1379010491762081933>`,
            inline: true,
          },
          {
            name: '🛒 How to Get More',
            value: 'Use `X shop` to buy Mana Crystals with LUX!',
            inline: true,
          }
        )
        .setColor('#800080')
        .setFooter({ text: `Checked by ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
        .setTimestamp();

      await message.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Error in manacrystals command:', error);
      await message.reply('❌ Error checking Mana Crystals: Unable to retrieve your balance. Please try again later.');
    }
  },
};
