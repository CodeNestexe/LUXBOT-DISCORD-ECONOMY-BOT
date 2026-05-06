const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'drop',
  description: 'Drops a specified amount from the casino bank to 5-10 random members (owner/co-owner only)',
  async execute(message, args, db) {
    console.log(`Received drop command: ${message.content}, args: ${args}`);
    const userId = message.author.id;

    if (args.length === 0) {
      console.log('No amount provided for drop');
      return message.reply('Please provide an amount! Usage: `X casino drop {amount}`');
    }

    const amount = parseInt(args[0]);
    if (!amount || amount <= 0) {
      console.log('Invalid amount provided for drop');
      return message.reply('Please provide a valid positive amount! Usage: `X casino drop {amount}`');
    }

    try {
      // Check if the user is the owner or co-owner of a casino
      const casinoName = await db.getUserCasino(userId); // Use db.getUserCasino
      if (!casinoName) {
        console.log(`User ${userId} is not a member of any casino`);
        return message.reply('You must be a member of a casino to run a drop!');
      }

      const casino = await db.getCasinoInfo(casinoName); // Use db.getCasinoInfo
      if (!casino) {
        console.error(`Casino ${casinoName} not found in database`);
        return message.reply('Error: Casino not found.');
      }

      // Check if the executor is the owner or co-owner
      if (casino.ownerId !== userId && !casino.coOwners.includes(userId)) {
        console.log(`User ${userId} is not the owner or co-owner of ${casinoName}`);
        return message.reply('Only the casino owner or co-owners can run a drop!');
      }

      // Get the current bank balance
      const bankBalance = await db.getCasinoBankBalance(casinoName); // Use db.getCasinoBankBalance
      if (bankBalance < amount) {
        console.log(`Requested amount ${amount} exceeds bank balance ${bankBalance} for ${casinoName}`);
        return message.reply(`The casino bank only has ${bankBalance} LUX! You cannot drop more than the available balance.`);
      }

      // Get all eligible members (owner, co-owners, and regular members)
      const eligibleMembers = [casino.ownerId, ...casino.coOwners, ...casino.members.filter(m => m !== casino.ownerId && !casino.coOwners.includes(m))];
      if (eligibleMembers.length < 5) {
        console.log(`Not enough members (${eligibleMembers.length}) in ${casinoName} for a drop (minimum 5 required)`);
        return message.reply('There are not enough members in the casino to perform a drop (minimum 5 required)!');
      }

      // Randomly select 5-10 members
      const minWinners = 5;
      const maxWinners = Math.min(10, eligibleMembers.length); // Cap at 10 or total members
      const numberOfWinners = Math.floor(Math.random() * (maxWinners - minWinners + 1)) + minWinners;
      const winners = [];
      const selectedMemberIds = new Set();
      while (winners.length < numberOfWinners && selectedMemberIds.size < eligibleMembers.length) {
        const randomIndex = Math.floor(Math.random() * eligibleMembers.length);
        const memberId = eligibleMembers[randomIndex];
        if (!selectedMemberIds.has(memberId)) {
          selectedMemberIds.add(memberId);
          winners.push(memberId);
        }
      }

      // Calculate amount per winner
      const amountPerWinner = Math.floor(amount / numberOfWinners);
      if (amountPerWinner === 0) {
        console.log(`Amount per winner is 0 after splitting ${amount} among ${numberOfWinners} winners`);
        return message.reply('The amount is too small to distribute evenly among the selected winners!');
      }

      // Distribute the LUX to winners
      for (const winnerId of winners) {
        const winner = await db.getUser(winnerId); // Use db.getUser
        await db.updateUser(winnerId, { balance: winner.balance + amountPerWinner }); // Use db.updateUser
        console.log(`Distributed ${amountPerWinner} LUX to winner ${winnerId} of ${casinoName}`);

        // Send DM to winner
        try {
          const user = await message.client.users.fetch(winnerId);
          await user.send(`Congratulations ${user.toString()}! You won a drop in ${casinoName} of ${amountPerWinner} LUX!`);
          console.log(`Sent DM to winner ${winnerId}`);
        } catch (dmError) {
          console.error(`Failed to send DM to winner ${winnerId}: ${dmError.message}`);
          await message.channel.send(`Failed to DM winner ${winnerId}. They may have DMs disabled.`);
        }
      }

      // Deduct the total distributed amount from the casino bank
      const totalDistributed = amountPerWinner * numberOfWinners;
      await db.updateCasinoBankBalance(casinoName, -totalDistributed); // Use db.updateCasinoBankBalance

      // Announce the drop in the channel
      const dropEmbed = new EmbedBuilder()
        .setColor('#32CD32') // Lime green for drop
        .setTitle('Casino Drop!')
        .setDescription(
          `🎲 **${casinoName}** has dropped **${totalDistributed} LUX** to **${numberOfWinners} random members**!\n` +
          `Each winner received **${amountPerWinner} LUX**.`
        )
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });

      await message.channel.send({ embeds: [dropEmbed] });
    } catch (error) {
      console.error(`Error in drop command: ${error.message}`);
      await message.reply(`Error: ${error.message}`);
    }
  },
};