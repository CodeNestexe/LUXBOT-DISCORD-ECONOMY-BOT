const db = require('../database');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

// Temporary cache to track pending join requests (requestId: {userId, casinoName, ownerId})
const joinRequests = new Map();

module.exports = {
  name: 'join',
  description: 'Requests to join a specified casino',
  async execute(message, args) {
    console.log(`Received join command: ${message.content}, args: ${args}`);
    if (args.length === 0 || !args[0]) {
      console.log('No casino name provided, replying with usage');
      return message.reply('Please provide the casino name! Usage: `X casino join {casino_name}`');
    }

    const casinoName = args.join(' '); // Join all args as the casino name
    const userId = message.author.id;

    try {
      // Check if the user is the owner of another casino
      const userCasino = await getUserCasino(userId);
      if (userCasino && userCasino.ownerId === userId) {
        console.log(`User ${userId} is the owner of ${userCasino}, cannot join another casino`);
        return message.reply('You are the owner of a casino! You cannot join another casino.');
      }

      const dbInstance = await db.getDB();
      const casino = await dbInstance.collection('casinos').findOne({ name: casinoName });

      if (!casino) {
        console.log(`Casino ${casinoName} not found`);
        return message.reply('Casino not found!');
      }

      if (casino.members.length >= casino.maxMembers) {
        console.log(`Casino ${casinoName} has reached the maximum member limit`);
        return message.reply('This casino has reached the maximum member limit (50)!');
      }

      if (casino.members.includes(userId)) {
        console.log(`User ${userId} is already a member of ${casinoName}`);
        return message.reply('You are already a member of this casino!');
      }

      // Generate a unique request ID
      const requestId = `${userId}:${casinoName}:${Date.now()}`;
      joinRequests.set(requestId, { userId, casinoName, ownerId: casino.ownerId });

      // Send invite request to the owner
      const owner = await message.client.users.fetch(casino.ownerId);
      const requestEmbed = new EmbedBuilder()
        .setColor('#800080') // Purple color
        .setTitle('Join Request')
        .setDescription(`<@${userId}> wants to join your casino **${casinoName}**.`)
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });

      const acceptButton = new ButtonBuilder()
        .setCustomId(`accept_join_${requestId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success);

      const declineButton = new ButtonBuilder()
        .setCustomId(`decline_join_${requestId}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(acceptButton, declineButton);

      let ownerMessage;
      try {
        ownerMessage = await owner.send({ embeds: [requestEmbed], components: [row] });
        await message.reply(`Join request sent to the owner of **${casinoName}**! Waiting for their response...`);
      } catch (dmError) {
        console.error(`Failed to send DM to owner ${casino.ownerId}: ${dmError.message}`);
        const dmFailedEmbed = new EmbedBuilder()
          .setColor('#FFA500') // Orange color
          .setTitle('Join Request Failed to Send via DM')
          .setDescription(`<@${casino.ownerId}>, <@${userId}> wants to join your casino **${casinoName}**. Please respond below.\n(Unable to send DM, please enable DMs from server members.)`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        ownerMessage = await message.channel.send({ embeds: [dmFailedEmbed], components: [row] });
      }

      // Wait for the owner's response (60 seconds timeout)
      const filter = (interaction) =>
        interaction.user.id === casino.ownerId &&
        (interaction.customId.startsWith('accept_join_') || interaction.customId.startsWith('decline_join_'));
      const collector = ownerMessage.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async (interaction) => {
        await interaction.deferUpdate(); // Acknowledge the interaction

        const requestData = joinRequests.get(interaction.customId.split('_')[2]);
        if (!requestData) {
          await interaction.followUp({ content: 'Request data not found.', ephemeral: true });
          return;
        }

        if (interaction.customId.startsWith('accept_join_')) {
          try {
            // Check if the user is already in another casino
            const userCurrentCasino = await getUserCasino(requestData.userId);
            if (userCurrentCasino) {
              const alreadyInCasinoEmbed = new EmbedBuilder()
                .setColor('#FF0000') // Red color
                .setTitle('Cannot Join Casino')
                .setDescription(`<@${requestData.userId}> is already a member of **${userCurrentCasino}**! They must leave their current casino before joining another.`)
                .setTimestamp()
                .setFooter({ text: 'Powered by LuxBot' });
              await interaction.followUp({ embeds: [alreadyInCasinoEmbed], ephemeral: true });
              joinRequests.delete(interaction.customId.split('_')[2]);
              return;
            }

            // Add the user to the casino
            await dbInstance.collection('casinos').updateOne(
              { name: casinoName },
              { $push: { members: requestData.userId }, $set: { memberCount: casino.members.length + 1 } }
            );
            console.log(`Added ${requestData.userId} to casino ${casinoName}`);

            // Send acceptance DM to the user
            const user = await message.client.users.fetch(requestData.userId);
            const acceptEmbed = new EmbedBuilder()
              .setColor('#00FF00') // Green color
              .setTitle('Join Request Accepted')
              .setDescription(`Congratulations! You are now a member of **${casinoName}**.`)
              .setTimestamp()
              .setFooter({ text: 'Powered by LuxBot' });
            await user.send({ embeds: [acceptEmbed] });

            // Send confirmation to the owner
            const ownerConfirmEmbed = new EmbedBuilder()
              .setColor('#00FF00') // Green color
              .setTitle('Join Request Accepted')
              .setDescription(`<@${requestData.userId}> is now a member of **${casinoName}**.`)
              .setTimestamp()
              .setFooter({ text: 'Powered by LuxBot' });
            await interaction.followUp({ embeds: [ownerConfirmEmbed] });
          } catch (error) {
            console.error(`Error accepting join request: ${error.message}`);
            await interaction.followUp({ content: `Error: ${error.message}`, ephemeral: true });
          }
        } else if (interaction.customId.startsWith('decline_join_')) {
          try {
            // Send decline DM to the user
            const user = await message.client.users.fetch(requestData.userId);
            const declineEmbed = new EmbedBuilder()
              .setColor('#FF0000') // Red color
              .setTitle('Join Request Declined')
              .setDescription(`Your request to join **${casinoName}** has been declined.`)
              .setTimestamp()
              .setFooter({ text: 'Powered by LuxBot' });
            await user.send({ embeds: [declineEmbed] });

            // Send confirmation to the owner
            const ownerConfirmEmbed = new EmbedBuilder()
              .setColor('#FF0000') // Red color
              .setTitle('Join Request Declined')
              .setDescription(`You declined <@${requestData.userId}>'s request to join **${casinoName}**.`)
              .setTimestamp()
              .setFooter({ text: 'Powered by LuxBot' });
            await interaction.followUp({ embeds: [ownerConfirmEmbed] });
          } catch (error) {
            console.error(`Error declining join request: ${error.message}`);
            await interaction.followUp({ content: `Error: ${error.message}`, ephemeral: true });
          }
        }

        // Disable the buttons after response
        const disabledRow = new ActionRowBuilder().addComponents(
          acceptButton.setDisabled(true),
          declineButton.setDisabled(true)
        );
        await ownerMessage.edit({ components: [disabledRow] });
        joinRequests.delete(interaction.customId.split('_')[2]);
        collector.stop();
      });

      collector.on('end', (collected) => {
        if (!collected.size) {
          // Timeout: No response from the owner
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#FFA500') // Orange color
            .setTitle('Join Request Expired')
            .setDescription(`The owner did not respond to your join request for **${casinoName}**.`)
            .setTimestamp()
            .setFooter({ text: 'Powered by LuxBot' });
          message.client.users.fetch(userId).then(user => user.send({ embeds: [timeoutEmbed] })).catch(() => {});
          joinRequests.delete(requestId);

          // Disable the buttons
          const disabledRow = new ActionRowBuilder().addComponents(
            acceptButton.setDisabled(true),
            declineButton.setDisabled(true)
          );
          ownerMessage.edit({ components: [disabledRow] });
        }
      });
    } catch (error) {
      console.error(`Error in join command: ${error.message}`);
      joinRequests.delete(`${userId}:${casinoName}:${Date.now()}`);
      await message.reply(`Error: ${error.message}`);
    }
  },
};

async function getUserCasino(userId) {
  console.log(`Checking casino for user ${userId}`);
  const dbInstance = await db.getDB();
  console.log(`DB instance for getUserCasino:`, dbInstance ? 'valid' : 'invalid');
  const casinos = await dbInstance.collection('casinos').find().toArray();
  for (const casino of casinos) {
    if (casino.ownerId === userId || casino.members.includes(userId)) {
      return casino;
    }
  }
  return null;
}