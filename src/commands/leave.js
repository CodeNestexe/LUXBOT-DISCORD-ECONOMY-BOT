const { EmbedBuilder } = require('discord.js');

// Temporary cache to track users awaiting confirmation
const leaveConfirmation = new Set();

module.exports = {
  name: 'leave',
  description: 'Leaves the current casino',
  async execute(message, args, db) {
    console.log(`Received leave command: ${message.content}, args: ${args}`);
    const userId = message.author.id;

    try {
      // Check if the user is in a casino
      const casinoName = await db.getUserCasino(userId); // Use db.getUserCasino
      if (!casinoName) {
        console.log(`User ${userId} is not a member of any casino`);
        return message.reply('You are not a member of any casino!');
      }

      const dbInstance = await db.getDB(); // Use db.getDB
      const casino = await dbInstance.collection('casinos').findOne({ name: casinoName });

      if (!casino) {
        console.error(`Casino ${casinoName} not found in database`);
        return message.reply('Error: Casino not found.');
      }

      // Check if the user is the owner
      if (casino.ownerId === userId) {
        console.log(`User ${userId} is the owner of ${casinoName}, cannot leave`);
        return message.reply('You are the owner of this casino! You cannot leave. Use `X casino delete` to delete the casino instead.');
      }

      // Check if the user has already initiated the leave process
      if (leaveConfirmation.has(userId)) {
        // User has confirmed, proceed with leaving
        await dbInstance.collection('casinos').updateOne(
          { name: casinoName },
          { $pull: { members: userId }, $set: { memberCount: casino.members.length - 1 } }
        );
        console.log(`User ${userId} left casino ${casinoName}`);

        // Clear the confirmation
        leaveConfirmation.delete(userId);

        // Send confirmation to the user
        const userEmbed = new EmbedBuilder()
          .setColor('#00FF00') // Green color
          .setTitle('Left Casino')
          .setDescription(`You have successfully left **${casinoName}**.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        await message.reply({ embeds: [userEmbed] });

        // Notify the casino owner
        const owner = await message.client.users.fetch(casino.ownerId);
        const ownerEmbed = new EmbedBuilder()
          .setColor('#FF0000') // Red color
          .setTitle('Member Left Casino')
          .setDescription(`<@${userId}> left your casino **${casinoName}**.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });

        try {
          await owner.send({ embeds: [ownerEmbed] });
          console.log(`Notified owner ${casino.ownerId} of member leaving`);
        } catch (dmError) {
          console.error(`Failed to send DM to owner ${casino.ownerId}: ${dmError.message}`);
          // If DM fails, send the notification in the channel
          await message.channel.send({
            embeds: [
              new EmbedBuilder()
                .setColor('#FFA500') // Orange color
                .setTitle('Notification Failed')
                .setDescription(`<@${casino.ownerId}>, <@${userId}> left your casino **${casinoName}**. (Couldn’t send DM, please enable DMs from server members.)`)
                .setTimestamp()
                .setFooter({ text: 'Powered by LuxBot' }),
            ],
          });
        }
      } else {
        // First time running the command, ask for confirmation
        leaveConfirmation.add(userId);
        console.log(`User ${userId} initiated leave process for casino ${casinoName}`);

        const confirmationEmbed = new EmbedBuilder()
          .setColor('#FFA500') // Orange color
          .setTitle('Confirm Leave')
          .setDescription(`Do you really want to leave **${casinoName}**? To confirm, please run the command again: \`X casino leave\`.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        await message.reply({ embeds: [confirmationEmbed] });
      }
    } catch (error) {
      console.error(`Error in leave command: ${error.message}`);
      leaveConfirmation.delete(userId); // Clear confirmation on error
      await message.reply(`Error: ${error.message}`);
    }
  },
};