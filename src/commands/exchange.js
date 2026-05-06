const { EmbedBuilder } = require('discord.js');
const db = require('../database');

module.exports = {
  name: 'exchange',
  aliases: ['manapoint'],
  async execute(message, args) {
    try {
      const userId = message.author.id;
      const user = await db.getUser(userId);

      // Validate Mana Points
      const manaPoints = user.manaPoints || 0;
      if (manaPoints < 100) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('⚠️ Insufficient Mana Points')
          .setDescription('You need at least **100 Mana Points** to exchange for Mana Crystals.')
          .addFields(
            { name: 'Your Mana Points', value: `**${manaPoints}**`, inline: true },
            { name: 'Required', value: '**100**', inline: true },
            { name: 'Needed', value: `**${100 - manaPoints}** more`, inline: true }
          )
          .setColor('#FF4444')
          .setThumbnail('https://cdn-icons-png.flaticon.com/512/1828/1828843.png')
          .setFooter({ text: 'Keep playing games to earn more Mana Points!' })
          .setTimestamp();

        return message.reply({ embeds: [errorEmbed] });
      }

      // Calculate exchange
      const crystals = Math.floor(manaPoints / 100); // Number of Mana Crystals
      const remainingManaPoints = manaPoints % 100; // Remaining Mana Points

      // Initial message with GIF
      const gifUrl = 'https://media4.giphy.com/media/RmkAysf4z5c5QLhEch/giphy.gif?cid=6c09b952xi3w9hk9nxypch1cpqjg2yd4fo9nmwbwdiatqhg5&ep=v1_internal_gif_by_id&rid=giphy.gif&ct=g';
      
      const loadingEmbed = new EmbedBuilder()
        .setTitle('🔄 Processing Exchange...')
        .setDescription(`${message.author} is converting **${crystals * 100} Mana Points** into **${crystals} Mana Crystal${crystals !== 1 ? 's' : ''}**`)
        .setColor('#FFAA00')
        .setThumbnail(gifUrl)
        .setFooter({ text: 'Please wait while we process your exchange...' })
        .setTimestamp();

      const initialMessage = await message.channel.send({
        embeds: [loadingEmbed]
      });

      // Wait for 5 seconds (adjust as needed)
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Update database
      await db.updateUser(userId, { 
        manaPoints: remainingManaPoints, 
        manaCrystals: (user.manaCrystals || 0) + crystals 
      });

      // Create success embed
      const successEmbed = new EmbedBuilder()
        .setTitle('✨ Exchange Complete!')
        .setDescription('Your Mana Points have been successfully converted to Mana Crystals!')
        .addFields(
          { 
            name: '💎 Mana Crystals Received', 
            value: `**+${crystals}** ${crystals === 1 ? 'Crystal' : 'Crystals'}`, 
            inline: true 
          },
          { 
            name: '🔮 Remaining Mana Points', 
            value: `**${remainingManaPoints}** Points`, 
            inline: true 
          },
          { 
            name: '💎 Total Mana Crystals', 
            value: `**${(user.manaCrystals || 0) + crystals}** Crystals`, 
            inline: true 
          }
        )
        .setColor('#00FF88')
        .setThumbnail('https://cdn-icons-png.flaticon.com/512/2913/2913465.png')
        .setFooter({ 
          text: `Exchange Rate: 100 Mana Points = 1 Mana Crystal | Keep playing to earn more!` 
        })
        .setTimestamp();

      // Update message with result
      await initialMessage.edit({
        embeds: [successEmbed]
      });

    } catch (error) {
      console.error('Error in exchange command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Exchange Failed')
        .setDescription(`An error occurred while processing your exchange: ${error.message}`)
        .setColor('#FF0000')
        .setFooter({ text: 'Please try again later or contact support if the issue persists.' })
        .setTimestamp();

      await message.reply({ embeds: [errorEmbed] });
    }
  },
};
