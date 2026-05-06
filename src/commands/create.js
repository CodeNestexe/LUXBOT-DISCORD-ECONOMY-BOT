const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'create',
  description: 'Creates a new casino (150,000 Lux and Level 5 required)',
  async execute(message, args, db) {
    console.log(`Received create command: ${message.content}, args: ${args}`);
    if (args.length === 0 || !args[0]) {
      console.log('Insufficient args for create, replying with usage');
      return message.reply('Please provide a casino name! Usage: `X casino create {name}`');
    }
    const casinoName = args.join(' '); // Join all args as the name
    const ownerId = message.author.id;
    console.log(`Attempting to create casino ${casinoName} for owner ${ownerId}`);

    try {
      // Check if the user already owns a casino
      const dbInstance = await db.getDB();
      const existingCasino = await dbInstance.collection('casinos').findOne({ ownerId });
      if (existingCasino) {
        console.log(`User ${ownerId} already owns casino ${existingCasino.name}, denying creation`);
        return message.reply('You already own a casino! Please delete your current casino before creating a new one.');
      }

      // Fetch user data to check balance and level
      const user = await db.getUser(ownerId);
      console.log(`User data for ${ownerId}:`, user);

      // Check balance (150,000 Lux)
      if (user.balance < 150000) {
        console.log(`User ${ownerId} has insufficient Lux: ${user.balance}`);
        return message.reply('You need at least 150,000 Lux to create a casino!');
      }

      // Check level (Level 5)
      if (user.level < 1) {
        console.log(`User ${ownerId} is below Level 5: ${user.level}`);
        return message.reply('You need to be at least Level 5 to create a casino!');
      }

      // Create the casino (correct argument order: ownerId first, casinoName second)
      const casino = await db.createCasino(ownerId, casinoName);
      console.log(`Casino ${casinoName} created by ${ownerId}`);

      // Deduct 150,000 Lux from the user's balance
      await db.updateUser(ownerId, {
        balance: user.balance - 150000,
        profile: user.profile,
        items: user.items,
        pets: user.pets,
        xp: user.xp,
        level: user.level,
        lastDailyXPReset: user.lastDailyXPReset,
      });
      console.log(`Deducted 150,000 Lux from ${ownerId}, new balance: ${user.balance - 150000}`);

      // Send success embed
      const embed = new EmbedBuilder()
        .setColor('#800080') // Purple color
        .setTitle('Casino Created')
        .setDescription(`Casino **${casino.name}** has been created by <@${ownerId}>!\n150,000 Lux has been deducted from your balance.`)
        .addFields(
          { name: 'Owner', value: `<@${ownerId}>`, inline: true },
          { name: 'Members', value: `1/50`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Powered by LuxBot' });
      await message.reply({ embeds: [embed] });
      console.log(`Casino ${casinoName} creation completed for ${ownerId}`);
    } catch (error) {
      console.error(`Error creating casino: ${error.message}`);
      if (error.message === 'Casino already exists!') {
        const dbInstance = await db.getDB();
        const existingCasino = await dbInstance.collection('casinos').findOne({ name: casinoName });
        console.log(`Debug: Existing casino with name ${casinoName}:`, existingCasino);
        if (existingCasino) {
          const ownerId = existingCasino.ownerId;
          await message.reply(
            `A casino named **${casinoName}** already exists, owned by <@${ownerId}>! ` +
            (ownerId === message.author.id
              ? 'Since you own it, you can delete it with `X casino delete` and try again.'
              : 'Please choose a different name.')
          );
        } else {
          await message.reply(`Unexpected error: A casino with this name was detected, but not found in debug. Please contact support.`);
        }
      } else {
        await message.reply(`Error: ${error.message}`);
      }
    }
  },
};