const db = require('../database');
const { EmbedBuilder } = require('discord.js');

// Temporary cache to track users awaiting confirmation (userId:targetId)
const promoteConfirmation = new Map();

module.exports = {
  name: 'promote',
  description: 'Promotes a member to co-owner (owner only)',
  async execute(message, args) {
    console.log(`Received promote command: ${message.content}, args: ${args}`);
    if (!message.mentions.users.size) {
      console.log('No user mentioned for promote, replying with usage');
      return message.reply('Please mention a user to promote! Usage: `X casino promote {@user}`');
    }

    const userToPromote = message.mentions.users.first();
    const userToPromoteId = userToPromote.id;
    const executorId = message.author.id;

    try {
      // Check if the executor is the owner of a casino
      const casinoName = await getUserCasino(executorId);
      if (!casinoName) {
        console.log('Executor not a casino owner, replying with error');
        return message.reply('You must be the owner of a casino to promote members!');
      }

      const dbInstance = await db.getDB();
      const casino = await dbInstance.collection('casinos').findOne({ name: casinoName });

      if (!casino) {
        console.error(`Casino ${casinoName} not found in database`);
        return message.reply('Error: Casino not found.');
      }

      // Ensure coOwners is an array, default to empty if undefined
      const coOwners = casino.coOwners || [];

      // Check if the executor is the owner
      if (casino.ownerId !== executorId) {
        console.log(`User ${executorId} is not the owner of ${casinoName}`);
        return message.reply('Only the casino owner can promote members!');
      }

      // Check if the user to promote is valid
      if (casino.ownerId === userToPromoteId) {
        console.log(`Cannot promote owner ${userToPromoteId}`);
        return message.reply('You cannot promote yourself or another owner!');
      }

      if (coOwners.includes(userToPromoteId)) {
        console.log(`User ${userToPromoteId} is already a co-owner of ${casinoName}`);
        return message.reply('This user is already a co-owner!');
      }

      if (!casino.members.includes(userToPromoteId)) {
        console.log(`User ${userToPromoteId} is not a member of ${casinoName}`);
        return message.reply('This user is not a member of your casino!');
      }

      // Check co-owner limit (max 2)
      if (coOwners.length >= 2) {
        console.log(`Casino ${casinoName} has reached the maximum co-owner limit (2)`);
        return message.reply('This casino has reached the maximum co-owner limit (2)!');
      }

      // Check if the user has already initiated the promotion process
      const confirmationKey = `${executorId}:${userToPromoteId}`;
      if (promoteConfirmation.has(confirmationKey)) {
        // User has confirmed, proceed with promotion
        await dbInstance.collection('casinos').updateOne(
          { name: casinoName },
          { $push: { coOwners: userToPromoteId } },
          { upsert: false }
        );
        console.log(`Promoted ${userToPromoteId} to co-owner of ${casinoName}`);

        // Clear the confirmation
        promoteConfirmation.delete(confirmationKey);

        // Send DM to the promoted user
        const promoteEmbed = new EmbedBuilder()
          .setColor('#00FF00') // Green color
          .setTitle('Promotion to Co-Owner')
          .setDescription(`Congratulations! You are promoted to co-owner of **${casinoName}**.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        try {
          await userToPromote.send({ embeds: [promoteEmbed] });
          console.log(`Sent promotion notification to ${userToPromoteId}`);
        } catch (dmError) {
          console.error(`Failed to send DM to ${userToPromoteId}: ${dmError.message}`);
          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#FFA500') // Orange color
                .setTitle('DM Failed')
                .setDescription(`<@${userToPromoteId}> was promoted to co-owner of **${casinoName}**, but we couldn’t send them a DM. (Please enable DMs from server members.)`)
                .setTimestamp()
                .setFooter({ text: 'Powered by LuxBot' }),
            ],
          });
        }

        // Send confirmation to the owner
        const confirmEmbed = new EmbedBuilder()
          .setColor('#00FF00') // Green color
          .setTitle('Promotion Confirmed')
          .setDescription(`<@${userToPromoteId}> is now a co-owner of **${casinoName}**.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        await message.reply({ embeds: [confirmEmbed] });
      } else {
        // First time running the command, ask for confirmation
        promoteConfirmation.set(confirmationKey, true);
        console.log(`User ${executorId} initiated promotion process for ${userToPromoteId}`);

        const confirmationEmbed = new EmbedBuilder()
          .setColor('#FFA500') // Orange color
          .setTitle('Confirm Promotion')
          .setDescription(`Do you really want to promote <@${userToPromoteId}> to co-owner? To confirm, please run the command again: \`X casino promote <@${userToPromoteId}>\`.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        await message.reply({ embeds: [confirmationEmbed] });
      }
    } catch (error) {
      console.error(`Error in promote command: ${error.message}`);
      promoteConfirmation.delete(`${executorId}:${userToPromoteId}`); // Clear confirmation on error
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
    if (casino.ownerId === userId || casino.members.includes(userId) || (casino.coOwners || []).includes(userId)) {
      return casino.name;
    }
  }
  return null;
}