const db = require('../database');
const { EmbedBuilder } = require('discord.js');

// Temporary cache to track users awaiting confirmation (userId: casinoName)
const deleteConfirmation = new Map();

module.exports = {
  name: 'delete',
  description: 'Deletes the specified casino (owner only)',
  async execute(message, args) {
    console.log(`Received delete command: ${message.content}, args: ${args}`);
    if (args.length === 0 || !args[0]) {
      console.log('No casino name provided, replying with usage');
      return message.reply('Please provide the casino name! Usage: `X casino delete {casino_name}`');
    }

    const casinoName = args.join(' '); // Join all args as the casino name
    const userId = message.author.id;

    try {
      // Check if the casino exists and the user is the owner
      const dbInstance = await db.getDB();
      const casino = await dbInstance.collection('casinos').findOne({ name: casinoName });

      if (!casino) {
        console.log(`Casino ${casinoName} not found`);
        return message.reply('Casino not found!');
      }

      if (casino.ownerId !== userId) {
        console.log(`User ${userId} is not the owner of ${casinoName}`);
        return message.reply('You must be the owner of the casino to delete it!');
      }

      // Check if the user has already initiated the delete process
      const confirmationKey = `${userId}:${casinoName}`;
      if (deleteConfirmation.has(confirmationKey)) {
        // User has confirmed, proceed with deletion
        await dbInstance.collection('casinos').deleteOne({ name: casinoName });
        console.log(`Casino ${casinoName} deleted by ${userId}`);

        // Clear the confirmation
        deleteConfirmation.delete(confirmationKey);

        // Send confirmation to the user
        const userEmbed = new EmbedBuilder()
          .setColor('#FF0000') // Red color
          .setTitle('Casino Deleted')
          .setDescription(`You have successfully deleted **${casinoName}**.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        await message.reply({ embeds: [userEmbed] });
      } else {
        // First time running the command, ask for confirmation
        deleteConfirmation.set(confirmationKey, true);
        console.log(`User ${userId} initiated delete process for casino ${casinoName}`);

        const confirmationEmbed = new EmbedBuilder()
          .setColor('#FFA500') // Orange color
          .setTitle('Confirm Delete')
          .setDescription(`You really want to delete **${casinoName}** casino? To confirm, please run the command again: \`X casino delete ${casinoName}\`.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        await message.reply({ embeds: [confirmationEmbed] });
      }
    } catch (error) {
      console.error(`Error in delete command: ${error.message}`);
      deleteConfirmation.delete(`${userId}:${casinoName}`); // Clear confirmation on error
      await message.reply(`Error: ${error.message}`);
    }
  },
};