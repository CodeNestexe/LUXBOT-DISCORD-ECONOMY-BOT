const { EmbedBuilder } = require('discord.js');
const gamblingDatabase = require('../gamblingDatabase');

module.exports = {
  name: 'coinflip',
  aliases: ['cf'],
  async execute(message, args, db) {
    try {
      console.log('Executing coinflip for:', message.author.id);
      if (args.length < 2) return message.reply('Usage: X coinflip <amount> <heads/tails> or X cf <amount> <h/t>');

      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) return message.reply('Invalid bet amount!');

      const choice = args[1].toLowerCase();
      const validChoices = ['heads', 'tails', 'h', 't'];
      if (!validChoices.includes(choice)) return message.reply('Choose heads (h) or tails (t)!');

      const userChoice = choice === 'h' || choice === 'heads' ? 'heads' : 'tails';

      // Validate the bet (max 300,000 and sufficient balance)
      await db.validateBet(message.author.id, amount);

      // Deduct the bet amount with Mana Zone buff
      await gamblingDatabase.deductBalance(message.author.id, amount, true);

      // Update quest progress for playing coinflip
      await db.updateQuestProgress(message.author.id, 'play_coinflip');

      // Refresh user data to get the updated balance
      const user = await db.getUser(message.author.id);
      if (typeof user.balance !== 'number' || isNaN(user.balance)) {
        throw new Error('Balance is invalid after deduction. Please contact support.');
      }

      // Award Mana Points for playing (regardless of win/loss)
      const manaPointsToAdd = 10; // 10 Mana Points per play
      await db.addManaPoints(message.author.id, manaPointsToAdd);

      // Send initial message with coinflip animation
      const initialMessage = `<@${message.author.id}> wagered ${amount.toLocaleString()} on ${userChoice}\nCoin spins... <a:Coinflip:1347445841979510827>`;
      const msg = await message.channel.send(initialMessage);

      // Simulate coinflip after a delay
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2-second delay for animation

      // Determine result (50/50 chance)
      const result = Math.random() < 0.5 ? 'heads' : 'tails';
      const won = result === userChoice;

      // Update quest progress for winning coinflip
      if (won) {
        await db.updateQuestProgress(message.author.id, 'win_coinflip');
      }

      // Calculate winnings with Mana Zone buff if applicable
      let winnings = 0;
      if (won) {
        winnings = amount * 2; // Double the bet on win
        winnings = await gamblingDatabase.adjustBalanceWithManaZone(message.author.id, winnings, true);
      }

      if (typeof winnings !== 'number' || isNaN(winnings)) {
        throw new Error('Calculated winnings are invalid!');
      }

      // Update user balance and stats
      const updatedUser = await db.getUser(message.author.id); // Refresh user data
      if (typeof updatedUser.balance !== 'number' || isNaN(updatedUser.balance)) {
        throw new Error('Balance is invalid after coinflip. Please contact support.');
      }
      const newBalance = updatedUser.balance + winnings;
      if (typeof newBalance !== 'number' || isNaN(newBalance)) {
        console.error(`Calculated newBalance is invalid for user ${message.author.id}. Updated user balance: ${updatedUser.balance}, Winnings: ${winnings}`);
        throw new Error('Invalid balance calculation. Please contact support.');
      }
      const newProfile = {
        ...updatedUser.profile,
        wins: won ? (updatedUser.profile?.wins || 0) + 1 : (updatedUser.profile?.wins || 0),
        losses: !won ? (updatedUser.profile?.losses || 0) + 1 : (updatedUser.profile?.losses || 0),
      };
      await db.updateUser(message.author.id, {
        balance: newBalance,
        profile: newProfile,
        items: updatedUser.items,
        pets: updatedUser.pets,
      });

      // Check if Mana Zone buff is active
      const userWithBuffs = await db.getUser(message.author.id);
      let isManaZoneActive = false;
      if (userWithBuffs.buffs?.manaZone?.active) {
        const now = Date.now();
        const buffStartTime = new Date(userWithBuffs.buffs.manaZone.startTime).getTime();
        const buffDuration = userWithBuffs.buffs.manaZone.duration;
        if (now < buffStartTime + buffDuration) {
          isManaZoneActive = true;
        } else {
          // Buff has expired, deactivate it
          await db.updateUser(message.author.id, {
            'buffs.manaZone.active': false,
          });
          console.log(`Mana Zone buff expired for user ${message.author.id}`);
        }
      }

      // Edit the message with the result
      if (won) {
        await msg.edit(
          `<@${message.author.id}> wagered ${amount.toLocaleString()} on ${userChoice}\n` +
          `Coin spins... **${result}**! You nab ${winnings.toLocaleString()}! 💎${isManaZoneActive ? ' (25% extra)' : ''}`
        );
      } else {
        await msg.edit(
          `<@${message.author.id}> wagered ${amount.toLocaleString()} on ${userChoice}\n` +
          `Coin spins... **${result}**! You Lost.${isManaZoneActive ? ' (25% amount refunded)' : ''}`
        );
      }

    } catch (error) {
      console.error('Error in coinflip command:', error.message);
      await message.reply(`Error: ${error.message}`);
    }
  },
};
