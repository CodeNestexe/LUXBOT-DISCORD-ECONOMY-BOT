const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

module.exports = {
  name: 'banners',
  aliases: [],
  async execute(message, args, db) {
    try {
      // Define the list of banners
      const banners = [
        { file: 'profile.jpg', name: 'Default Profile Background', id: 'default', type: 'Profile' },
        { file: 'background010.jpg', name: 'Background 010', id: '010', type: 'Profile' },
        { file: 'background011.jpg', name: 'Background 011', id: '011', type: 'Profile' },
        // Placeholder for Level banners (can be expanded later)
        { file: null, name: 'Coming Soon!', id: 'level-placeholder', type: 'Level' },
      ];

      // Resize banner images for preview (400x303)
      const bannerPreviews = [];
      for (const banner of banners) {
        if (banner.file) {
          const bannerPath = path.join(__dirname, '../assets/Images', banner.file);
          if (!fs.existsSync(bannerPath)) {
            console.error(`Banner file not found: ${bannerPath}`);
            bannerPreviews.push(null);
            continue;
          }

          // Resize the image to 400x303
          const resizedBuffer = await sharp(bannerPath)
            .resize(400, 303, { fit: 'fill' })
            .png()
            .toBuffer();

          bannerPreviews.push(new AttachmentBuilder(resizedBuffer, { name: `${banner.file.split('.')[0]}_preview.png` }));
        } else {
          bannerPreviews.push(null); // Placeholder for banners without images (e.g., Level banners)
        }
      }

      // Initialize the current banner index
      let currentIndex = 0;

      // Create the initial embed
      const createEmbed = (index) => {
        const banner = banners[index];
        const embed = new EmbedBuilder()
          .setTitle(`${banner.type} Banner`)
          .setColor('#FFD700')
          .addFields(
            { name: 'Banner Number', value: `\`${banner.id}\``, inline: true },
            { name: 'Type', value: banner.type, inline: true }
          );

        if (bannerPreviews[index]) {
          embed.setImage(`attachment://${bannerPreviews[index].name}`);
        } else {
          embed.setDescription('Coming Soon! No image available yet.');
        }

        return embed;
      };

      // Create navigation buttons
      const createButtons = (index) => {
        return new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('left')
              .setEmoji('⬅️')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(index === 0), // Disable on first banner
            new ButtonBuilder()
              .setCustomId('right')
              .setEmoji('➡️')
              .setStyle(ButtonStyle.Primary)
              .setDisabled(index === banners.length - 1), // Disable on last banner
          );
      };

      // Send the initial message
      const embed = createEmbed(currentIndex);
      const row = createButtons(currentIndex);
      const attachments = bannerPreviews[currentIndex] ? [bannerPreviews[currentIndex]] : [];
      const bannerMessage = await message.channel.send({
        embeds: [embed],
        components: [row],
        files: attachments,
      });

      // Set up an InteractionCollector for button interactions
      const filter = i => i.user.id === message.author.id && ['left', 'right'].includes(i.customId);
      const collector = bannerMessage.createMessageComponentCollector({
        filter,
        time: 60_000, // 60 seconds
      });

      collector.on('collect', async i => {
        try {
          // Update the current index based on the button clicked
          if (i.customId === 'right') {
            currentIndex++;
          } else if (i.customId === 'left') {
            currentIndex--;
          }

          // Update the embed and buttons
          const newEmbed = createEmbed(currentIndex);
          const newRow = createButtons(currentIndex);
          const newAttachments = bannerPreviews[currentIndex] ? [bannerPreviews[currentIndex]] : [];

          await i.update({
            embeds: [newEmbed],
            components: [newRow],
            files: newAttachments,
          });
        } catch (error) {
          console.error('Error handling button interaction:', error);
        }
      });

      collector.on('end', async () => {
        try {
          // Disable the buttons after the collector ends
          row.components.forEach(component => component.setDisabled(true));
          await bannerMessage.edit({ components: [row] });
        } catch (error) {
          console.error('Error disabling buttons:', error);
        }
      });

    } catch (error) {
      console.error('Error in banners command:', error);
      await message.reply(`Error displaying banners: ${error.message}`).catch(err => {
        console.error('Failed to send error reply to Discord:', err);
      });
    }
  },
};