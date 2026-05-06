const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'donate',
  description: 'Donates LUX to the casino bank',
  async execute(message, args, db) {
    console.log(`Received donate command: ${message.content}, args: ${args}`);
    if (args.length === 0 || !parseInt(args[0]) || parseInt(args[0]) <= 0) {
      console.log('Invalid or no amount provided for donate');
      return message.reply('Please provide a valid positive amount! Usage: `X casino donate {amount}`');
    }

    const amount = parseInt(args[0]);
    const userId = message.author.id;

    try {
      // Check if the user is a member of a casino
      const casinoName = await db.getUserCasino(userId); // Use db.getUserCasino
      if (!casinoName) {
        console.log(`User ${userId} is not a member of any casino`);
        return message.reply('You must be a member of a casino to donate!');
      }

      const user = await db.getUser(userId); // Use db.getUser
      if (user.balance < amount) {
        console.log(`User ${userId} has insufficient balance (${user.balance}) for donation of ${amount}`);
        return message.reply('You don’t have enough LUX to donate!');
      }

      // Deduct from user and add to casino bank
      await db.updateUser(userId, {
        balance: user.balance - amount,
        profile: user.profile,
        items: user.items,
        pets: user.pets,
        xp: user.xp,
        level: user.level,
        lastDailyXPReset: user.lastDailyXPReset,
      }); // Use db.updateUser with full user object
      await db.updateCasinoBankBalance(casinoName, amount); // Use db.updateCasinoBankBalance

      // Broadcast donation message
      const donateMessage = `<@${userId}> donated ${amount} LUX to ${casinoName}`;
      const donateEmbed = new EmbedBuilder()
        .setColor('#32CD32') // Lime green for donation
        .setDescription(donateMessage)
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });

      await message.channel.send({ embeds: [donateEmbed] });
    } catch (error) {
      console.error(`Error in donate command: ${error.message}`);
      await message.reply(`Error: ${error.message}`);
    }
  },
};