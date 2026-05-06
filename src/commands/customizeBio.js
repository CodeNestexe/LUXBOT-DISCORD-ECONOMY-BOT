const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'customize',
  aliases: ['customizebio', 'customize bio'],
  async execute(message, args, db) {
    try {
      console.log('Executing customize bio command for:', message.author.id);

      // Create initial prompt embed
      const promptEmbed = new EmbedBuilder()
        .setTitle('📝 Customize Your Bio')
        .setDescription('Please reply with your bio.\n**Character limit: 50 characters (including spaces)**')
        .setColor('#00AAFF')
        .setFooter({ text: 'You have 60 seconds to respond' })
        .setTimestamp();

      await message.reply({ embeds: [promptEmbed] });

      // Create a message collector to wait for the user's response
      const filter = m => m.author.id === message.author.id;
      const collector = message.channel.createMessageCollector({ filter, time: 60000, max: 1 });

      collector.on('collect', async m => {
        const bio = m.content.trim();
        console.log('Submitted bio:', bio);

        // Count characters instead of words (including spaces)
        const characterCount = bio.length;
        console.log('Character count:', characterCount);

        // Enforce 50-character limit (changed from 200)
        const maxCharacters = 50;
        if (characterCount > maxCharacters) {
          const errorEmbed = new EmbedBuilder()
            .setTitle('❌ Bio Too Long')
            .setDescription(`Your bio is **${characterCount} characters** long.\nMaximum allowed: **${maxCharacters} characters**\n\nPlease shorten it by **${characterCount - maxCharacters}** characters and try again.`)
            .setColor('#FF4444')
            .setFooter({ text: 'Use X customize bio to try again' })
            .setTimestamp();

          await message.reply({ embeds: [errorEmbed] });
          return;
        }

        // Prevent completely empty bios
        if (characterCount === 0) {
          const emptyEmbed = new EmbedBuilder()
            .setTitle('❌ Empty Bio')
            .setDescription('Your bio cannot be empty. Please provide some content.')
            .setColor('#FF4444')
            .setFooter({ text: 'Use X customize bio to try again' })
            .setTimestamp();

          await message.reply({ embeds: [emptyEmbed] });
          return;
        }

        // Save the bio to the database
        console.log('Saving bio to database...');
        const user = await db.getUser(message.author.id);
        if (!user.profile) user.profile = {};
        user.profile.bio = bio;
        await db.updateUser(message.author.id, user);
        console.log('Bio saved successfully.');

        // Success embed with character count
        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Bio Updated Successfully!')
          .setDescription(`Your new bio:\n\`\`\`${bio}\`\`\``)
          .addFields(
            { name: '📊 Character Count', value: `**${characterCount}**/${maxCharacters}`, inline: true },
            { name: '👤 Profile', value: 'Use `X profile` to view', inline: true }
          )
          .setColor('#00FF88')
          .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
          .setFooter({ text: 'Your profile has been updated!' })
          .setTimestamp();

        await message.reply({ embeds: [successEmbed] });
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          const timeoutEmbed = new EmbedBuilder()
            .setTitle('⏰ Time\'s Up!')
            .setDescription('You took too long to respond. Please try again.')
            .setColor('#FFAA00')
            .setFooter({ text: 'Use X customize bio to try again' })
            .setTimestamp();

          message.reply({ embeds: [timeoutEmbed] });
        }
      });

    } catch (error) {
      console.error('Error in customize bio command:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription(`An error occurred while customizing your bio: ${error.message}`)
        .setColor('#FF0000')
        .setFooter({ text: 'Please try again or contact support' })
        .setTimestamp();

      await message.reply({ embeds: [errorEmbed] }).catch(err => {
        console.error('Failed to send error reply to Discord:', err);
      });
    }
  },
};
