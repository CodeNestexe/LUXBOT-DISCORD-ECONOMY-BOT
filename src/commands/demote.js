const db = require('../database');
const { EmbedBuilder } = require('discord.js');

// Temporary cache to track users awaiting confirmation (userId:targetId)
const demoteConfirmation = new Map();

module.exports = {
  name: 'demote',
  description: 'Demotes a co-owner to member (owner only)',
  async execute(message, args) {
    console.log(`Received demote command: ${message.content}, args: ${args}`);
    if (!message.mentions.users.size) {
      console.log('No user mentioned for demote, replying with usage');
      return message.reply('Please mention a user to demote! Usage: `X casino demote {@user}`');
    }

    const userToDemote = message.mentions.users.first();
    const userToDemoteId = userToDemote.id;
    const executorId = message.author.id;

    try {
      // Check if the executor is the owner of a casino
      const casinoName = await getUserCasino(executorId);
      if (!casinoName) {
        console.log('Executor not a casino owner, replying with error');
        return message.reply('You must be the owner of a casino to demote members!');
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
        return message.reply('Only the casino owner can demote co-owners!');
      }

      // Check if the user to demote is a co-owner
      if (!coOwners.includes(userToDemoteId)) {
        console.log(`User ${userToDemoteId} is not a co-owner of ${casinoName}`);
        return message.reply('This user is not a co-owner!');
      }

      // Check if the user to demote is the owner
      if (casino.ownerId === userToDemoteId) {
        console.log(`Cannot demote owner ${userToDemoteId}`);
        return message.reply('You cannot demote yourself!');
      }

      // Check if the user has already initiated the demotion process
      const confirmationKey = `${executorId}:${userToDemoteId}`;
      if (demoteConfirmation.has(confirmationKey)) {
        // User has confirmed, proceed with demotion
        await dbInstance.collection('casinos').updateOne(
          { name: casinoName },
          { $pull: { coOwners: userToDemoteId } },
          { upsert: false }
        );
        console.log(`Demoted ${userToDemoteId} from co-owner of ${casinoName}`);

        // Clear the confirmation
        demoteConfirmation.delete(confirmationKey);

        // Send DM to the demoted user
        const demoteEmbed = new EmbedBuilder()
          .setColor('#FF0000') // Red color
          .setTitle('Demoted from Co-Owner')
          .setDescription(`<@${userToDemoteId}> you are demoted to member by <@${executorId}>.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        try {
          await userToDemote.send({ embeds: [demoteEmbed] });
          console.log(`Sent demotion notification to ${userToDemoteId}`);
        } catch (dmError) {
          console.error(`Failed to send DM to ${userToDemoteId}: ${dmError.message}`);
          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#FFA500') // Orange color
                .setTitle('DM Failed')
                .setDescription(`<@${userToDemoteId}> was demoted to member by <@${executorId}>, but we couldn’t send them a DM. (Please enable DMs from server members.)`)
                .setTimestamp()
                .setFooter({ text: 'Powered by LuxBot' }),
            ],
          });
        }

        // Send confirmation to the owner
        const confirmEmbed = new EmbedBuilder()
          .setColor('#00FF00') // Green color
          .setTitle('Demotion Confirmed')
          .setDescription(`<@${userToDemoteId}> has been demoted to member of **${casinoName}**.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        await message.reply({ embeds: [confirmEmbed] });
      } else {
        // First time running the command, ask for confirmation
        demoteConfirmation.set(confirmationKey, true);
        console.log(`User ${executorId} initiated demotion process for ${userToDemoteId}`);

        const confirmationEmbed = new EmbedBuilder()
          .setColor('#FFA500') // Orange color
          .setTitle('Confirm Demotion')
          .setDescription(`Do you really want to demote <@${userToDemoteId}> to member? To confirm, please run the command again: \`X casino demote <@${userToDemoteId}>\`.`)
          .setTimestamp()
          .setFooter({ text: 'Powered by LuxBot' });
        await message.reply({ embeds: [confirmationEmbed] });
      }
    } catch (error) {
      console.error(`Error in demote command: ${error.message}`);
      demoteConfirmation.delete(`${executorId}:${userToDemoteId}`); // Clear confirmation on error
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