const db = require('../database');
const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

module.exports = {
  name: 'add',
  description: 'Sends an invite to a user to join the casino (owner only)',
  async execute(message, args) {
    console.log(`Received add command: ${message.content}, args: ${args}`);
    if (!message.mentions.users.size) {
      console.log('No user mentioned for add, replying with usage');
      return message.reply('Please mention a user to invite! Usage: `X casino add {@user}`');
    }

    const userToAdd = message.mentions.users.first();
    const userToAddId = userToAdd.id;
    const executorId = message.author.id;
    const casinoName = await getUserCasino(executorId);

    // Check if the executor is the owner of a casino
    if (!casinoName) {
      console.log('Executor not a casino owner, replying with error');
      return message.reply('You must be the owner of a casino to invite members!');
    }

    try {
      const dbInstance = await db.getDB();
      const casino = await dbInstance.collection('casinos').findOne({ name: casinoName });

      // Check if the casino exists and the executor is the owner
      if (!casino) {
        throw new Error('Casino not found!');
      }
      if (casino.ownerId !== executorId) {
        throw new Error('Only the casino owner can invite members!');
      }
      if (casino.members.length >= casino.maxMembers) {
        throw new Error('Casino has reached the maximum member limit (50)!');
      }
      if (casino.members.includes(userToAddId)) {
        throw new Error('This user is already a member of the casino!');
      }

      // Send invite embed to the user
      const inviteEmbed = new EmbedBuilder()
        .setColor('#800080') // Purple color
        .setTitle('Casino Invite')
        .setDescription(`<@${executorId}> Owner of **${casinoName}** sent you a request to join their casino. Do you want to accept?`)
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });

      const acceptButton = new ButtonBuilder()
        .setCustomId(`accept_invite_${userToAddId}_${casinoName}_${executorId}`)
        .setLabel('Accept')
        .setStyle(ButtonStyle.Success);

      const rejectButton = new ButtonBuilder()
        .setCustomId(`reject_invite_${userToAddId}_${casinoName}_${executorId}`)
        .setLabel('Reject')
        .setStyle(ButtonStyle.Danger);

      const row = new ActionRowBuilder().addComponents(acceptButton, rejectButton);

      const inviteMessage = await userToAdd.send({ embeds: [inviteEmbed], components: [row] });
      await message.reply(`Invite sent to <@${userToAddId}>! Waiting for their response...`);

      // Wait for the user's response (60 seconds timeout)
      const filter = (interaction) =>
        interaction.user.id === userToAddId &&
        (interaction.customId.startsWith('accept_invite_') || interaction.customId.startsWith('reject_invite_'));
      const collector = inviteMessage.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async (interaction) => {
        await interaction.deferUpdate(); // Acknowledge the interaction

        if (interaction.customId.startsWith('accept_invite_')) {
          try {
            // Check if the user is already in another casino
            const userCasino = await getUserCasino(userToAddId);
            if (userCasino) {
              const alreadyInCasinoEmbed = new EmbedBuilder()
                .setColor('#FF0000') // Red color
                .setTitle('Cannot Join Casino')
                .setDescription(`You are already a member of **${userCasino}**! You must leave your current casino before joining another.`)
                .setTimestamp()
                .setFooter({ text: 'Powered by LuxBot' });
              await interaction.followUp({ embeds: [alreadyInCasinoEmbed], ephemeral: true });

              // Inform the owner that the user couldn't join
              const ownerFailedEmbed = new EmbedBuilder()
                .setColor('#FF0000') // Red color
                .setTitle('Casino Invite Failed')
                .setDescription(`<@${userToAddId}> is already a member of another casino (**${userCasino}**) and cannot join **${casinoName}** until they leave their current casino.`)
                .setTimestamp()
                .setFooter({ text: 'Powered by LuxBot' });
              await message.channel.send({ embeds: [ownerFailedEmbed] });
              return;
            }

            // Add the user to the casino
            await dbInstance.collection('casinos').updateOne(
              { name: casinoName },
              { $push: { members: userToAddId }, $set: { memberCount: casino.members.length + 1 } }
            );
            console.log(`Added ${userToAddId} to casino ${casinoName}`);

            // Send confirmation to the owner
            const ownerSuccessEmbed = new EmbedBuilder()
              .setColor('#00FF00') // Green color
              .setTitle('Casino Invite Accepted')
              .setDescription(`<@${userToAddId}> accepted your invite to join **${casinoName}**!`)
              .setTimestamp()
              .setFooter({ text: 'Powered by LuxBot' });
            await message.channel.send({ embeds: [ownerSuccessEmbed] });

            // Send confirmation to the user
            const userSuccessEmbed = new EmbedBuilder()
              .setColor('#00FF00') // Green color
              .setTitle('Joined Casino')
              .setDescription(`You have successfully joined **${casinoName}**!`)
              .setTimestamp()
              .setFooter({ text: 'Powered by LuxBot' });
            await interaction.followUp({ embeds: [userSuccessEmbed], ephemeral: true });
          } catch (error) {
            console.error(`Error adding member: ${error.message}`);
            await interaction.followUp({ content: `Error: ${error.message}`, ephemeral: true });
          }
        } else if (interaction.customId.startsWith('reject_invite_')) {
          // Send rejection to the owner
          const ownerRejectEmbed = new EmbedBuilder()
            .setColor('#FF0000') // Red color
            .setTitle('Casino Invite Rejected')
            .setDescription(`<@${userToAddId}> rejected your invite to join **${casinoName}**.`)
            .setTimestamp()
            .setFooter({ text: 'Powered by LuxBot' });
          await message.channel.send({ embeds: [ownerRejectEmbed] });

          // Send confirmation to the user
          const userRejectEmbed = new EmbedBuilder()
            .setColor('#FF0000') // Red color
            .setTitle('Invite Rejected')
            .setDescription(`You have rejected the invite to join **${casinoName}**.`)
            .setTimestamp()
            .setFooter({ text: 'Powered by LuxBot' });
          await interaction.followUp({ embeds: [userRejectEmbed], ephemeral: true });
        }

        // Disable the buttons after response
        const disabledRow = new ActionRowBuilder().addComponents(
          acceptButton.setDisabled(true),
          rejectButton.setDisabled(true)
        );
        await inviteMessage.edit({ components: [disabledRow] });
        collector.stop();
      });

      collector.on('end', (collected) => {
        if (!collected.size) {
          // Timeout: No response from the user
          const timeoutEmbed = new EmbedBuilder()
            .setColor('#FFA500') // Orange color
            .setTitle('Casino Invite Expired')
            .setDescription(`<@${userToAddId}> did not respond to the invite for **${casinoName}**.`)
            .setTimestamp()
            .setFooter({ text: 'Powered by LuxBot' });
          message.channel.send({ embeds: [timeoutEmbed] });

          // Disable the buttons
          const disabledRow = new ActionRowBuilder().addComponents(
            acceptButton.setDisabled(true),
            rejectButton.setDisabled(true)
          );
          inviteMessage.edit({ components: [disabledRow] });
        }
      });
    } catch (error) {
      console.error(`Error sending invite: ${error.message}`);
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
      return casino.name;
    }
  }
  return null;
}