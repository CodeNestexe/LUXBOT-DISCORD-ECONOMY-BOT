const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'cash',
  aliases: ['balance', 'bal'],
  async execute(message) {
    const user = await db.getUser(message.author.id);
    const embed = new EmbedBuilder()
      .setColor('#FFD700')
      .setTitle(`${message.author.username}'s Balance`)
      .setDescription(` **${user.balance} <:lux:1411637514569252894>**`)
      .setThumbnail(message.author.displayAvatarURL())
      .setFooter({ text: 'Keep gaming with Lux!' });
    await message.channel.send({ embeds: [embed] });
  },
};