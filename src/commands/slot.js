const gamblingDatabase = require('../gamblingDatabase'); // Import gamblingDatabase for Mana Zone functions

module.exports = {
  name: 'slot',
  aliases: ['s'],
  async execute(message, args, db) {
    try {
      console.log('Executing slot for:', message.author.id);
      if (args.length < 1) return message.reply('Usage: X slot <amount> or X s <amount>');

      const amount = parseInt(args[0]);
      if (isNaN(amount) || amount <= 0) return message.reply('Invalid bet amount!');

      // Validate the bet (max 300,000 and sufficient balance)
      await db.validateBet(message.author.id, amount);

      // Deduct the bet amount with Mana Zone buff
      await gamblingDatabase.deductBalance(message.author.id, amount, true);

      // Update quest progress for playing slots
      await db.updateQuestProgress(message.author.id, 'play_slots');

      // Refresh user data to get the updated balance
      const user = await db.getUser(message.author.id);
      if (typeof user.balance !== 'number' || isNaN(user.balance)) {
        throw new Error('Balance is invalid after deduction. Please contact support.');
      }

      // Define symbols with their multipliers and win probabilities
      const symbols = {
        '<:lux_10x:1348251300395094126>': { multiplier: 10, chance: 0.01 }, // 1% chance to win
        '<:lux_5x:1348251568356462653>': { multiplier: 5, chance: 0.025 }, // 2.5% chance to win
        '<:lux_3x:1348251689555333171>': { multiplier: 3, chance: 0.05 }, // 5% chance to win
        '<:lux_2x:1348256421850120293>': { multiplier: 2, chance: 0.20 }, // 20% chance to win
        '🍌': { multiplier: 1, chance: 0.20 }, // 20% chance to win
      };

      // Verify the total win probability
      const totalWinChance = Object.values(symbols).reduce((sum, { chance }) => sum + chance, 0);
      if (Math.abs(totalWinChance - 0.485) > 0.0001) {
        console.error(`Total win chance does not sum to 0.485: ${totalWinChance}`);
      }

      // All possible symbols for random selection in lose case
      const symbolList = Object.keys(symbols);

      // Function to select a symbol randomly (for lose case)
      const getRandomSymbol = () => {
        const index = Math.floor(Math.random() * symbolList.length);
        return symbolList[index];
      };

      // Function to select a winning symbol based on win probabilities
      const getWinningSymbol = () => {
        const roll = Math.random() * totalWinChance; // Scale roll to total win chance
        let cumulative = 0;
        for (const [symbol, { chance }] of Object.entries(symbols)) {
          cumulative += chance;
          if (roll < cumulative) return symbol;
        }
        console.error('getWinningSymbol failed to select a symbol');
        return '🍌'; // Fallback to most common symbol
      };

      // Function to generate three different symbols for a lose case
      const getLoseSymbols = () => {
        const result = [];
        let symbol1 = getRandomSymbol();
        result.push(symbol1);

        let symbol2;
        do {
          symbol2 = getRandomSymbol();
        } while (symbol2 === symbol1);
        result.push(symbol2);

        let symbol3;
        do {
          symbol3 = getRandomSymbol();
        } while (symbol3 === symbol1 || symbol3 === symbol2);
        result.push(symbol3);

        return result;
      };

      // Decide if this spin is a win or a lose, and set all three wheels accordingly
      let results;
      let won;
      if (Math.random() < totalWinChance) {
        const winningSymbol = getWinningSymbol();
        results = [winningSymbol, winningSymbol, winningSymbol];
        won = true;
      } else {
        results = getLoseSymbols();
        won = false;
      }

      // Log the results
      console.log('Slot results:', results, 'Won:', won);

      // Initial message with spinning animation
      let slotMessage = `**  \`___SLOTS___\`**\n` +
                       `\` \` <a:lux_slot:1348204607289167892> <a:lux_slot:1348204607289167892> <a:lux_slot:1348204607289167892> \` \` <@${message.author.id}> bet ${amount.toLocaleString()}\n` +
                       '  `|         |`\n' +
                       '  `|         |`';
      const msg = await message.channel.send(slotMessage);

      // Simulate 4-second spinning animation with sequential stops
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1-second initial spin
      slotMessage = `**  \`___SLOTS___\`**\n` +
                    `\` \` ${results[0]} <a:lux_slot:1348204607289167892> <a:lux_slot:1348204607289167892> \` \` <@${message.author.id}> bet ${amount.toLocaleString()}\n` +
                    '  `|         |`\n' +
                    '  `|         |`';
      await msg.edit(slotMessage);

      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5-second delay (total 2.5 seconds)
      slotMessage = `**  \`___SLOTS___\`**\n` +
                    `\` \` ${results[0]} ${results[1]} <a:lux_slot:1348204607289167892> \` \` <@${message.author.id}> bet ${amount.toLocaleString()}\n` +
                    '  `|         |`\n' +
                    '  `|         |`';
      await msg.edit(slotMessage);

      await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5-second delay (total 4 seconds)
      slotMessage = `**  \`___SLOTS___\`**\n` +
                    `\` \` ${results[0]} ${results[1]} ${results[2]} \` \` <@${message.author.id}> bet ${amount.toLocaleString()}\n` +
                    '  `|         |`\n' +
                    '  `|         |`';
      await msg.edit(slotMessage);

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

      // Determine reward
      let finalMessage = `**  \`___SLOTS___\`**\n` +
                        `\` \` ${results[0]} ${results[1]} ${results[2]} \` \` <@${message.author.id}> bet ${amount.toLocaleString()}\n` +
                        '  `|         |`\n' +
                        '  `|         |`';
      if (won) {
        const multiplier = symbols[results[0]].multiplier;
        let winningAmount = amount * multiplier;
        winningAmount = await gamblingDatabase.adjustBalanceWithManaZone(message.author.id, winningAmount, true);

        if (typeof winningAmount !== 'number' || isNaN(winningAmount)) {
          throw new Error('Calculated winning amount is invalid!');
        }

        const updatedUser = await db.getUser(message.author.id);
        if (typeof updatedUser.balance !== 'number' || isNaN(updatedUser.balance)) {
          throw new Error('Balance is invalid after slot spin. Please contact support.');
        }
        const newBalance = updatedUser.balance + winningAmount;
        if (typeof newBalance !== 'number' || isNaN(newBalance)) {
          console.error(`Calculated newBalance is invalid for user ${message.author.id}. Updated user balance: ${updatedUser.balance}, Winning Amount: ${winningAmount}`);
          throw new Error('Invalid balance calculation. Please contact support.');
        }

        await db.updateUser(message.author.id, {
          balance: newBalance,
          profile: { ...updatedUser.profile, wins: (updatedUser.profile?.wins || 0) + 1 },
          items: updatedUser.items,
          pets: updatedUser.pets,
        });

        finalMessage += ` and won ${winningAmount.toLocaleString()}!${isManaZoneActive ? ' (25% extra)' : ''}`;
      } else {
        const updatedUser = await db.getUser(message.author.id);
        if (typeof updatedUser.balance !== 'number' || isNaN(updatedUser.balance)) {
          throw new Error('Balance is invalid after slot spin. Please contact support.');
        }

        await db.updateUser(message.author.id, {
          balance: updatedUser.balance,
          profile: { ...updatedUser.profile, losses: (updatedUser.profile?.losses || 0) + 1 },
          items: updatedUser.items,
          pets: updatedUser.pets,
        });

        finalMessage += ` you lost your bet!${isManaZoneActive ? ' (25% amount refunded)' : ''}`;
      }

      await msg.edit(finalMessage);
    } catch (error) {
      console.error('Error in slot command:', error.message);
      await message.reply(`Error: ${error.message}`);
    }
  },
};
