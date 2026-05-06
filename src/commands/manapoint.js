const db = require('../database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'manapoint', // Updated from aurapoint
  description: 'Check your Mana Points',
  aliases: ['mp'], // Updated from ap
  async execute(message) {
    const userId = message.author.id;

    try {
      // Fetch the user
      const user = await db.getUser(userId);

      // Create the embed
      const manaEmbed = new EmbedBuilder()
        .setColor('#00FFFF') // Cyan color for a magical "mana" vibe
        .setTitle('✨ Your Mana Points ✨')
        .setDescription(
          `**${message.author.username}**, your mana flows with power!\n\n` +
          `**<a:mana:1411641046873542709>** ${user.manaPoints}\n` +
          `**Last Gambled:** <t:${Math.floor(user.lastGambleTime / 1000)}:R>`
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });

      await message.channel.send({ embeds: [manaEmbed] });
    } catch (error) {
      console.error(`Error in manapoint command: ${error.message}`);
      await message.reply(`Error: ${error.message}`);
    }
  },
};