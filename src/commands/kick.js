const db = require('../database');
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'kick',
  description: 'Kicks a member from the casino (owner only)',
  async execute(message, args) {
    console.log(`Received kick command: ${message.content}, args: ${args}`);
    if (!message.mentions.users.size) {
      console.log('No user mentioned for kick, replying with usage');
      return message.reply('Please mention a user to kick! Usage: `X casino kick {@user}`');
    }

    const userToKick = message.mentions.users.first();
    const userToKickId = userToKick.id;
    const executorId = message.author.id;

    try {
      // Check if the executor is the owner of a casino
      const casinoName = await getUserCasino(executorId);
      if (!casinoName) {
        console.log('Executor not a casino owner, replying with error');
        return message.reply('You must be the owner of a casino to kick members!');
      }

      const dbInstance = await db.getDB();
      const casino = await dbInstance.collection('casinos').findOne({ name: casinoName });

      if (!casino) {
        console.error(`Casino ${casinoName} not found in database`);
        return message.reply('Error: Casino not found.');
      }

      // Check if the executor is the owner
      if (casino.ownerId !== executorId) {
        console.log(`User ${executorId} is not the owner of ${casinoName}`);
        return message.reply('Only the casino owner can kick members!');
      }

      // Check if the user to kick is a member
      if (!casino.members.includes(userToKickId)) {
        console.log(`User ${userToKickId} is not a member of ${casinoName}`);
        return message.reply('This user is not a member of your casino!');
      }

      // Check if the user to kick is the owner
      if (casino.ownerId === userToKickId) {
        console.log(`Cannot kick owner ${userToKickId} from ${casinoName}`);
        return message.reply('You cannot kick yourself from the casino! Use `X casino delete` to delete the casino.');
      }

      // Remove the user from the casino
      await dbInstance.collection('casinos').updateOne(
        { name: casinoName },
        { $pull: { members: userToKickId }, $set: { memberCount: casino.members.length - 1 } }
      );
      console.log(`Kicked ${userToKickId} from casino ${casinoName}`);

      // Send DM to the kicked user
      const kickEmbed = new EmbedBuilder()
        .setColor('#FF0000') // Red color
        .setTitle('Kicked from Casino')
        .setDescription(`You are kicked from casino **${casinoName}**.`)
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });

      try {
        await userToKick.send({ embeds: [kickEmbed] });
        console.log(`Sent kick notification to ${userToKickId}`);
      } catch (dmError) {
        console.error(`Failed to send DM to ${userToKickId}: ${dmError.message}`);
        await message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFA500') // Orange color
              .setTitle('DM Failed')
              .setDescription(`<@${userToKickId}> was kicked from **${casinoName}**, but we couldn’t send them a DM. (Please enable DMs from server members.)`)
              .setTimestamp()
              .setFooter({ text: 'Powered by LuxBot' }),
          ],
        });
      }

      // Send confirmation to the owner
      const confirmEmbed = new EmbedBuilder()
        .setColor('#00FF00') // Green color
        .setTitle('Member Kicked')
        .setDescription(`<@${userToKickId}> has been kicked from **${casinoName}**.`)
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });
      await message.reply({ embeds: [confirmEmbed] });
    } catch (error) {
      console.error(`Error in kick command: ${error.message}`);
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